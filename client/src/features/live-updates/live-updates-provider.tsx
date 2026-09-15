import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { orgTreeQueryKey } from '@/entities/org-node/api/org-tree.query'
import { applyOrgTreePatch } from '@/entities/org-node/live/apply-org-tree-patch'
import { getDataVersion } from '@/entities/org-node/live/data-version'
import { parseLiveMessage } from '@/entities/org-node/live/live-message.schema'
import type { OrgNode } from '@/entities/org-node/model/org-node.schema'
import { LiveStatusContext } from '@/features/live-updates/live-status-context'
import { getLiveUpdatesUrl, HEARTBEAT_TIMEOUT_FACTOR } from '@/features/live-updates/live-url'
import { ReconnectingSocket, type ConnectionStatus } from '@/shared/lib/live/reconnecting-socket'


interface LiveUpdatesProviderProps {
  children: ReactNode
  /** Injection point for tests. */
  createSocket?: (url: string) => WebSocket
}

/**
 * Keeps the org-tree cache in sync with the server over WebSocket:
 * - patch with the next version → merged into the cache (no refetch, incremental aggregates);
 * - hello / heartbeat → version check: equal → data marked fresh; different → one snapshot refetch;
 * - missed versions or an unknown node → one snapshot refetch.
 */
export function LiveUpdatesProvider({ children, createSocket }: LiveUpdatesProviderProps) {
  const client = useQueryClient()
  const [status, setStatus] = useState<ConnectionStatus>({ state: 'connecting' })
  const socketRef = useRef<ReconnectingSocket | null>(null)
  const createSocketRef = useRef(createSocket)

  useEffect(() => {
    const resync = () => {
      if (client.isFetching({ queryKey: orgTreeQueryKey }) > 0) return
      void client.invalidateQueries({ queryKey: orgTreeQueryKey, exact: true })
    }

    const syncVersion = (serverVersion: number) => {
      const data = client.getQueryData<OrgNode[]>(orgTreeQueryKey)
      if (!data) return // the initial snapshot is still loading
      if (getDataVersion(data) === serverVersion) {
        // Live and up to date: keep the data fresh so focus/remount do not refetch it.
        client.setQueryData(orgTreeQueryKey, data, { updatedAt: Date.now() })
      } else {
        resync()
      }
    }

    const socket = new ReconnectingSocket({
      url: getLiveUpdatesUrl(new URL(window.location.href)),
      createSocket: createSocketRef.current,
      onStatusChange: setStatus,
      onMessage: (raw) => {
        const message = parseLiveMessage(raw)
        if (!message) {
          console.warn('[live] ignored malformed message')
          return
        }
        switch (message.type) {
          case 'hello':
            socket.setHeartbeatTimeout(message.heartbeatIntervalMs * HEARTBEAT_TIMEOUT_FACTOR)
            syncVersion(message.version)
            break
          case 'heartbeat':
            syncVersion(message.version)
            break
          case 'patch':
            if (applyOrgTreePatch(client, message) === 'resync') resync()
            break
        }
      },
    })

    socketRef.current = socket
    socket.start()
    return () => {
      socket.stop()
      socketRef.current = null
    }
  }, [client])

  const value = useMemo(() => ({ status, reconnectNow: () => socketRef.current?.reconnectNow() }), [status])

  return <LiveStatusContext value={value}>{children}</LiveStatusContext>
}
