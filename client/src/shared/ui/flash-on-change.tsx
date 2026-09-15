import { useEffect, useRef, useState, type ReactNode } from 'react'
import styled, { keyframes } from 'styled-components'

/** How long an updated value stays highlighted while fading out. */
export const FLASH_DURATION_MS = 1500

const fadeOut = keyframes`
  from { background-color: ${({ theme }) => theme.colors.flash}; }
  to { background-color: transparent; }
`

const Highlight = styled.span`
  border-radius: 4px;
  box-decoration-break: clone;

  &[data-flash='true'] {
    animation-name: ${fadeOut};
    animation-duration: ${FLASH_DURATION_MS}ms;
    animation-timing-function: ease-out;
  }
`

interface FlashOnChangeProps {
  /** Compared with Object.is; pass the displayed (formatted) value to flash only visible changes. */
  value: unknown
  children: ReactNode
}

/**
 * Highlights its content when `value` changes (not on mount) and fades the highlight out.
 * A new value mid-fade remounts the span, restarting the animation. Pure CSS animation —
 * with prefers-reduced-motion the global style shortens it to an instant.
 */
export function FlashOnChange({ value, children }: FlashOnChangeProps) {
  const [previous, setPrevious] = useState(value)
  const [generation, setGeneration] = useState(0)
  const [active, setActive] = useState(false)

  if (!Object.is(previous, value)) {
    setPrevious(value)
    setGeneration((current) => current + 1)
    setActive(true)
  }

  // Native listener: React's onAnimationEnd depends on vendor detection that some environments lack.
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const element = ref.current
    if (!element || !active) return
    const clear = () => setActive(false)
    element.addEventListener('animationend', clear)
    return () => element.removeEventListener('animationend', clear)
  }, [active, generation])

  return (
    <Highlight ref={ref} key={generation} data-testid="flash" data-flash={active ? 'true' : undefined}>
      {children}
    </Highlight>
  )
}
