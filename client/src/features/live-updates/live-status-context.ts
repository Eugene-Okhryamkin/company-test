import { createContext } from 'react'
import type { ConnectionStatus } from '@/shared/lib/live/reconnecting-socket'

export interface LiveStatusValue {
  status: ConnectionStatus
  reconnectNow: () => void
}

export const LiveStatusContext = createContext<LiveStatusValue>({
  status: { state: 'closed' },
  reconnectNow: () => {},
})
