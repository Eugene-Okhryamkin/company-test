import { act } from '@testing-library/react'

type Listener = (event: MediaQueryListEvent) => void

interface Viewport {
  width: number
  reducedMotion: boolean
}

let viewport: Viewport = { width: 1024, reducedMotion: true }
const lists = new Set<{ query: string; listeners: Set<Listener>; mql: MediaQueryList }>()

/**
 * Evaluates (min-width: Npx) / (max-width: Npx) and (prefers-reduced-motion: reduce)
 * against a fake viewport. Any other feature does not match.
 */
function evaluate(query: string, { width, reducedMotion }: Viewport): boolean {
  if (query.includes('prefers-reduced-motion')) return reducedMotion
  const min = /\(min-width:\s*(\d+)px\)/.exec(query)
  const max = /\(max-width:\s*(\d+)px\)/.exec(query)
  if (!min && !max) return false
  return (!min || width >= Number(min[1])) && (!max || width <= Number(max[1]))
}

/**
 * Installs a fake window.matchMedia. Reduced motion defaults to ON so animated components settle
 * immediately in tests; animation tests opt out with { reducedMotion: false }.
 */
export function mockMatchMedia({ width = viewport.width, reducedMotion = true }: Partial<Viewport> = {}) {
  viewport = { width, reducedMotion }
  lists.clear()
  window.matchMedia = (query: string) => {
    const listeners = new Set<Listener>()
    const mql = {
      get matches() {
        return evaluate(query, viewport)
      },
      media: query,
      onchange: null,
      addEventListener: (_type: string, listener: Listener) => listeners.add(listener),
      removeEventListener: (_type: string, listener: Listener) => listeners.delete(listener),
      addListener: (listener: Listener) => listeners.add(listener),
      removeListener: (listener: Listener) => listeners.delete(listener),
      dispatchEvent: () => true,
    } as unknown as MediaQueryList
    lists.add({ query, listeners, mql })
    return mql
  }
}

function notify() {
  for (const { query, listeners, mql } of lists) {
    const event = { matches: evaluate(query, viewport), media: query } as MediaQueryListEvent
    listeners.forEach((listener) => listener.call(mql, event))
  }
}

/** Simulates a viewport resize and notifies subscribed media query lists. */
export function resizeViewport(width: number) {
  act(() => {
    viewport = { ...viewport, width }
    notify()
  })
}

export const subscribedMediaListeners = () => [...lists].reduce((sum, list) => sum + list.listeners.size, 0)
