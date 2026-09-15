import { renderHook } from '@testing-library/react'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { useMediaQuery } from '@/shared/lib/use-media-query'
import { mockMatchMedia, resizeViewport, subscribedMediaListeners } from '@/test/match-media'

describe('useMediaQuery', () => {
  it('reflects the current match', () => {
    mockMatchMedia({ width: 1440 })
    expect(renderHook(() => useMediaQuery('(min-width: 1280px)')).result.current).toBe(true)

    mockMatchMedia({ width: 800 })
    expect(renderHook(() => useMediaQuery('(min-width: 1280px)')).result.current).toBe(false)
  })

  it('updates when the viewport changes', () => {
    mockMatchMedia({ width: 1024 })
    const { result } = renderHook(() => useMediaQuery('(min-width: 1280px)'))

    resizeViewport(1280)
    expect(result.current).toBe(true)

    resizeViewport(1279)
    expect(result.current).toBe(false)
  })

  it('unsubscribes on unmount', () => {
    mockMatchMedia({ width: 1024 })
    const { unmount } = renderHook(() => useMediaQuery('(min-width: 1280px)'))
    expect(subscribedMediaListeners()).toBeGreaterThan(0)

    unmount()
    expect(subscribedMediaListeners()).toBe(0)
  })

  it('renders as "not matching" on the server (no window.matchMedia during SSR)', () => {
    mockMatchMedia({ width: 1920 })
    const Probe = () => createElement('output', null, String(useMediaQuery('(min-width: 1280px)')))
    expect(renderToString(createElement(Probe))).toContain('false')
  })
})
