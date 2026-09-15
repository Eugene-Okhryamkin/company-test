import { useEffect, useState } from 'react'
import styled from 'styled-components'
import { useLiveControls } from '@/features/live-updates/use-live-status'
import type { ConnectionStatus } from '@/shared/lib/live/reconnecting-socket'

type Tone = 'online' | 'pending' | 'offline'

const TONES: Record<ConnectionStatus['state'], Tone> = {
  open: 'online',
  connecting: 'pending',
  reconnecting: 'pending',
  offline: 'offline',
  closed: 'offline',
}

const Wrapper = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textMuted};
  white-space: nowrap;
`

const Dot = styled.span<{ $tone: Tone }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ theme, $tone }) =>
    $tone === 'online' ? theme.colors.performance.high : $tone === 'pending' ? theme.colors.performance.medium : theme.colors.performance.low};
`

const RetryButton = styled.button`
  padding: 2px 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-size: 12px;
  cursor: pointer;
`

/** Seconds left until `retryAt`, ticking every second. Mounted per attempt, so it starts fresh. */
function RetryCountdown({ retryAt }: { retryAt: number }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  return <>{Math.max(0, Math.ceil((retryAt - now) / 1000))}</>
}

function labelFor(status: ConnectionStatus) {
  switch (status.state) {
    case 'open':
      return 'Онлайн'
    case 'connecting':
      return 'Подключение…'
    case 'reconnecting':
      return (
        <>
          Нет связи · повтор через <RetryCountdown key={status.retryAt} retryAt={status.retryAt} /> с
        </>
      )
    case 'offline':
      return 'Нет сети'
    case 'closed':
      return 'Отключено'
  }
}

/** Live connection state for the header: coloured dot, text, countdown and manual retry. */
export function ConnectionIndicator() {
  const { status, reconnectNow } = useLiveControls()
  const reconnecting = status.state === 'reconnecting'
  const tone = TONES[status.state]

  return (
    <Wrapper role="status" aria-label="Соединение с сервером" aria-live="polite" data-tone={tone}>
      <Dot $tone={tone} aria-hidden="true" />
      <span>{labelFor(status)}</span>
      {reconnecting && (
        <RetryButton type="button" onClick={reconnectNow}>
          Переподключиться
        </RetryButton>
      )}
    </Wrapper>
  )
}
