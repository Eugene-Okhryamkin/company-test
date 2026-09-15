import styled from 'styled-components'
import { getPerformanceLevel, PERFORMANCE_LABELS, type PerformanceLevel } from '@/entities/org-node/model/performance'

const Dot = styled.span<{ $level: PerformanceLevel }>`
  display: inline-block;
  flex-shrink: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: ${({ theme, $level }) => theme.colors.performance[$level]};
`

interface PerformanceIndicatorProps {
  value: number
}

export function PerformanceIndicator({ value }: PerformanceIndicatorProps) {
  const level = getPerformanceLevel(value)
  const label = `Эффективность ${value} из 100 — ${PERFORMANCE_LABELS[level]}`

  return <Dot role="img" aria-label={label} title={label} data-level={level} $level={level} />
}
