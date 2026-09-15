import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DEFAULT_EXPANDED_DEPTH, useTreeExpansion } from '@/widgets/org-tree/use-tree-expansion'

describe('useTreeExpansion', () => {
  it('expands only the first level by default, so the second level is visible', () => {
    const { result } = renderHook(() => useTreeExpansion())

    expect(DEFAULT_EXPANDED_DEPTH).toBe(1)
    expect(result.current.isExpanded('d1', 1)).toBe(true)
    expect(result.current.isExpanded('d1-1', 2)).toBe(false)
    expect(result.current.isExpanded('d1-1-1', 3)).toBe(false)
  })

  it('supports a custom default depth', () => {
    const { result } = renderHook(() => useTreeExpansion(2))
    expect(result.current.isExpanded('d1-1', 2)).toBe(true)
    expect(result.current.isExpanded('d1-1-1', 3)).toBe(false)
  })

  it('toggles a node against its current state', () => {
    const { result } = renderHook(() => useTreeExpansion())

    act(() => result.current.toggle('d1', 1))
    expect(result.current.isExpanded('d1', 1)).toBe(false)

    act(() => result.current.toggle('d1-1', 2))
    expect(result.current.isExpanded('d1-1', 2)).toBe(true)

    act(() => result.current.toggle('d1-1', 2))
    expect(result.current.isExpanded('d1-1', 2)).toBe(false)
  })

  it('keeps toggle and isExpanded stable until the state changes', () => {
    const { result, rerender } = renderHook(() => useTreeExpansion())
    const { toggle, isExpanded } = result.current

    rerender()
    expect(result.current.toggle).toBe(toggle)
    expect(result.current.isExpanded).toBe(isExpanded)
  })
})
