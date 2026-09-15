export type PerformanceLevel = 'high' | 'medium' | 'low'

/** Lower bounds (inclusive) of each level on the 0–100 scale. */
export const PERFORMANCE_THRESHOLDS = { high: 80, medium: 60 } as const

export const PERFORMANCE_LABELS: Record<PerformanceLevel, string> = {
  high: 'высокая',
  medium: 'средняя',
  low: 'низкая',
}

export function getPerformanceLevel(value: number): PerformanceLevel {
  if (value >= PERFORMANCE_THRESHOLDS.high) return 'high'
  if (value >= PERFORMANCE_THRESHOLDS.medium) return 'medium'
  return 'low'
}
