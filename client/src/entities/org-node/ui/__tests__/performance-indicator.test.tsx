import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PerformanceIndicator } from '@/entities/org-node/ui/performance-indicator'
import { inlineStyled, renderWithProviders } from '@/test/render'

describe('PerformanceIndicator', () => {
  it.each([
    [92, 'high', 'Эффективность 92 из 100 — высокая'],
    [65, 'medium', 'Эффективность 65 из 100 — средняя'],
    [12, 'low', 'Эффективность 12 из 100 — низкая'],
  ])('%s → %s', (value, level, label) => {
    renderWithProviders(<PerformanceIndicator value={value} />)

    const indicator = screen.getByRole('img', { name: label })
    expect(indicator).toHaveAttribute('data-level', level)
    expect(indicator).toHaveAttribute('title', label)
  })

  it('uses the exact value for the level and one decimal for fractional values', () => {
    renderWithProviders(<PerformanceIndicator value={79.96} />)
    const indicator = screen.getByRole('img', { name: 'Эффективность 80,0 из 100 — средняя' })
    expect(indicator).toHaveAttribute('data-level', 'medium')
  })

  it('differs in color between levels without inline styles', () => {
    renderWithProviders(
      <>
        <PerformanceIndicator value={90} />
        <PerformanceIndicator value={10} />
      </>,
    )
    const [high, low] = screen.getAllByRole('img')
    expect(getComputedStyle(high!).backgroundColor).not.toBe(getComputedStyle(low!).backgroundColor)
    expect(inlineStyled()).toHaveLength(0)
  })
})
