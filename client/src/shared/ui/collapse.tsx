import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type TransitionEvent } from 'react'
import styled from 'styled-components'
import { useMediaQuery } from '@/shared/lib/use-media-query'

export const COLLAPSE_DURATION_MS = 200

type Phase = 'closed' | 'opening' | 'open' | 'closing'
/** 'measure' = render at natural height so it can be measured on the next layout effect. */
type Height = number | 'auto' | 'measure'

const Wrapper = styled.div<{ $height: Height; $animating: boolean }>`
  height: ${({ $height }) => (typeof $height === 'number' ? `${$height}px` : 'auto')};
  overflow: ${({ $animating }) => ($animating ? 'hidden' : 'visible')};
  transition: height ${COLLAPSE_DURATION_MS}ms ease;
`

interface CollapseProps {
  open: boolean
  children: ReactNode
}

/**
 * Animates mounting/unmounting of content with a real `height` transition:
 * opening 0 → measured px → auto, closing auto → measured px → 0 → unmount.
 * Heights are applied through styled-components classes (no inline styles). Respects
 * prefers-reduced-motion (instant), finishes even if `transitionend` never fires.
 */
export function Collapse({ open, children }: CollapseProps) {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const ref = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<Phase>(open ? 'open' : 'closed')
  const [height, setHeight] = useState<Height>('auto')
  const [previousOpen, setPreviousOpen] = useState(open)

  // React to `open` during render, so the first frame already has the starting height.
  if (open !== previousOpen) {
    setPreviousOpen(open)
    if (reducedMotion) {
      setPhase(open ? 'open' : 'closed')
      setHeight('auto')
    } else if (open) {
      setPhase('opening')
      setHeight(phase === 'closed' ? 0 : height === 'auto' || height === 'measure' ? 0 : height)
    } else {
      setPhase('closing')
      setHeight(phase === 'open' ? 'measure' : height)
    }
  }

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    if (phase === 'opening') {
      const target = element.scrollHeight
      if (height !== target) {
        void element.offsetHeight // commit the start height before changing it → the transition runs
        setHeight(target)
      }
    } else if (phase === 'closing') {
      if (height === 'measure') setHeight(element.scrollHeight)
      else if (height !== 0) {
        void element.offsetHeight
        setHeight(0)
      }
    }
  }, [phase, height])

  const finish = () => {
    if (phase === 'opening') {
      setPhase('open')
      setHeight('auto')
    } else if (phase === 'closing') {
      setPhase('closed')
      setHeight('auto')
    }
  }
  const finishRef = useRef(finish)
  useEffect(() => {
    finishRef.current = finish
  })

  // Safety net when transitionend is not delivered (element hidden, interrupted, …).
  useEffect(() => {
    if (phase !== 'opening' && phase !== 'closing') return
    const timer = setTimeout(() => finishRef.current(), COLLAPSE_DURATION_MS + 50)
    return () => clearTimeout(timer)
  }, [phase])

  const handleTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && event.propertyName === 'height') finish()
  }

  if (phase === 'closed') return null

  const closing = phase === 'closing'
  return (
    <Wrapper
      ref={ref}
      data-testid="collapse"
      data-state={phase}
      inert={closing || undefined}
      aria-hidden={closing || undefined}
      $height={height}
      $animating={phase === 'opening' || closing}
      onTransitionEnd={handleTransitionEnd}
    >
      {children}
    </Wrapper>
  )
}
