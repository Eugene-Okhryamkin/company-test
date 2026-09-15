import { act } from '@testing-library/react'

type Listener = (event: MediaQueryListEvent) => void

let currentWidth = 1024
const lists = new Set<{ query: string; listeners: Set<Listener>; mql: MediaQueryList }>()

/**
 * Evaluates simple (min-width: Npx) / (max-width: Npx) queries against a fake viewport width.
 * Any other feature (e.g. prefers-reduced-motion) does not match.
 */
function evaluate(query: string, width: number): boolean {
  const min = /\(min-width:\s*(\d+)px\)/.exec(query)
  const max = /\(max-width:\s*(\d+)px\)/.exec(query)
  if (!min && !max) return false
  return (!min || width >= Number(min[1])) && (!max || width <= Number(max[1]))
}

export function mockMatchMedia({ width }: { width: number }) {
  currentWidth = width
  lists.clear()
  window.matchMedia = (query: string) => {
    const listeners = new Set<Listener>()
    const mql = {
      get matches() {
        return evaluate(query, currentWidth)
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

/** Simulates a viewport resize and notifies subscribed media query lists. */
export function resizeViewport(width: number) {
  act(() => {
    currentWidth = width
    for (const { query, listeners, mql } of lists) {
      const event = { matches: evaluate(query, width), media: query } as MediaQueryListEvent
      listeners.forEach((listener) => listener.call(mql, event))
    }
  })
}

export const subscribedMediaListeners = () => [...lists].reduce((sum, list) => sum + list.listeners.size, 0)
