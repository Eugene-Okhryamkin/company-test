import { useCallback, useState } from 'react'

/** Nodes up to this level are expanded initially: divisions open → departments visible. */
export const DEFAULT_EXPANDED_DEPTH = 1

/**
 * Expansion state stored as explicit user overrides on top of a depth-based default.
 * New nodes from a data refresh get the default; nodes the user toggled keep their state.
 */
export function useTreeExpansion(defaultDepth: number = DEFAULT_EXPANDED_DEPTH) {
  const [overrides, setOverrides] = useState<ReadonlyMap<string, boolean>>(() => new Map())

  const isExpanded = useCallback(
    (id: string, level: number) => overrides.get(id) ?? level <= defaultDepth,
    [overrides, defaultDepth],
  )

  const toggle = useCallback(
    (id: string, level: number) => {
      setOverrides((previous) => {
        const next = new Map(previous)
        next.set(id, !(previous.get(id) ?? level <= defaultDepth))
        return next
      })
    },
    [defaultDepth],
  )

  return { isExpanded, toggle }
}
