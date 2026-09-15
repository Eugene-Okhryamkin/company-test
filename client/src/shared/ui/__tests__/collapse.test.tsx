import { act, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Collapse, COLLAPSE_DURATION_MS } from '@/shared/ui/collapse'
import { mockMatchMedia } from '@/test/match-media'
import { inlineStyled, renderWithProviders } from '@/test/render'

const CONTENT_HEIGHT = 120
const wrapper = () => screen.getByTestId('collapse')
const content = () => screen.queryByText('content')
const heightOf = (element: HTMLElement) => getComputedStyle(element).height
const endTransition = () => fireEvent.transitionEnd(wrapper(), { propertyName: 'height' })

const renderCollapse = (open: boolean) => renderWithProviders(<Collapse open={open}>content</Collapse>)

beforeEach(() => {
  mockMatchMedia({ reducedMotion: false })
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(CONTENT_HEIGHT)
})
afterEach(() => {
  vi.useRealTimers()
})

describe('Collapse', () => {
  it('renders open content without animating on mount', () => {
    renderCollapse(true)
    expect(content()).toBeInTheDocument()
    expect(wrapper()).toHaveAttribute('data-state', 'open')
    expect(heightOf(wrapper())).toBe('auto')
  })

  it('renders nothing when mounted closed', () => {
    renderCollapse(false)
    expect(content()).not.toBeInTheDocument()
  })

  it('opens with a height transition from 0 to the content height, then releases to auto', () => {
    const { rerender } = renderCollapse(false)

    rerender(<Collapse open>content</Collapse>)

    expect(content()).toBeInTheDocument()
    expect(wrapper()).toHaveAttribute('data-state', 'opening')
    expect(heightOf(wrapper())).toBe(`${CONTENT_HEIGHT}px`)
    expect(getComputedStyle(wrapper()).transition).toContain('height')

    endTransition()
    expect(wrapper()).toHaveAttribute('data-state', 'open')
    expect(heightOf(wrapper())).toBe('auto')
  })

  it('closes with a height transition to 0 and unmounts the content afterwards', () => {
    const { rerender } = renderCollapse(true)

    rerender(<Collapse open={false}>content</Collapse>)

    expect(wrapper()).toHaveAttribute('data-state', 'closing')
    expect(heightOf(wrapper())).toBe('0px')
    expect(content()).toBeInTheDocument()

    endTransition()
    expect(content()).not.toBeInTheDocument()
  })

  it('hides closing content from assistive technology and interaction', () => {
    const { rerender } = renderCollapse(true)
    rerender(<Collapse open={false}>content</Collapse>)

    expect(wrapper()).toHaveAttribute('inert')
    expect(wrapper()).toHaveAttribute('aria-hidden', 'true')
  })

  it('ignores transitions of nested elements and other properties', () => {
    const { rerender } = renderWithProviders(
      <Collapse open>
        <span>content</span>
      </Collapse>,
    )
    rerender(
      <Collapse open={false}>
        <span>content</span>
      </Collapse>,
    )

    fireEvent.transitionEnd(wrapper(), { propertyName: 'opacity' })
    fireEvent.transitionEnd(screen.getByText('content'), { propertyName: 'height' })

    expect(wrapper()).toHaveAttribute('data-state', 'closing')
  })

  it('finishes even if transitionend never fires', () => {
    vi.useFakeTimers()
    const { rerender } = renderCollapse(true)
    rerender(<Collapse open={false}>content</Collapse>)

    act(() => vi.advanceTimersByTime(COLLAPSE_DURATION_MS + 100))

    expect(content()).not.toBeInTheDocument()
  })

  it('can reverse direction mid-animation', () => {
    const { rerender } = renderCollapse(false)
    rerender(<Collapse open>content</Collapse>)
    rerender(<Collapse open={false}>content</Collapse>)

    expect(wrapper()).toHaveAttribute('data-state', 'closing')
    endTransition()
    expect(content()).not.toBeInTheDocument()
  })

  it('switches instantly when the user prefers reduced motion', () => {
    mockMatchMedia({ reducedMotion: true })
    const { rerender } = renderCollapse(false)

    rerender(<Collapse open>content</Collapse>)
    expect(wrapper()).toHaveAttribute('data-state', 'open')

    rerender(<Collapse open={false}>content</Collapse>)
    expect(content()).not.toBeInTheDocument()
  })

  it('animates only through CSS classes (no inline styles)', () => {
    const { rerender } = renderCollapse(false)
    rerender(<Collapse open>content</Collapse>)
    expect(inlineStyled()).toHaveLength(0)
  })
})
