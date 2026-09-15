import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FLASH_DURATION_MS, FlashOnChange } from '@/shared/ui/flash-on-change'
import { inlineStyled, renderWithProviders } from '@/test/render'

const flash = () => screen.getByTestId('flash')

describe('FlashOnChange', () => {
  it('fades out over about 1.5 s', () => {
    expect(FLASH_DURATION_MS).toBe(1500)
  })

  it('does not flash on the first render', () => {
    renderWithProviders(<FlashOnChange value={1}>1</FlashOnChange>)
    expect(flash()).not.toHaveAttribute('data-flash')
  })

  it('flashes when the value changes', () => {
    const { rerender } = renderWithProviders(<FlashOnChange value={1}>1</FlashOnChange>)
    rerender(<FlashOnChange value={2}>2</FlashOnChange>)

    expect(flash()).toHaveAttribute('data-flash', 'true')
    expect(flash()).toHaveTextContent('2')
  })

  it('does not flash when re-rendered with the same value', () => {
    const { rerender } = renderWithProviders(<FlashOnChange value={1}>1</FlashOnChange>)
    rerender(<FlashOnChange value={1}>1</FlashOnChange>)
    expect(flash()).not.toHaveAttribute('data-flash')
  })

  it('clears the flash when the fade animation ends', () => {
    const { rerender } = renderWithProviders(<FlashOnChange value={1}>1</FlashOnChange>)
    rerender(<FlashOnChange value={2}>2</FlashOnChange>)

    fireEvent.animationEnd(flash())

    expect(flash()).not.toHaveAttribute('data-flash')
  })

  it('restarts the fade when the value changes again mid-animation', () => {
    const { rerender } = renderWithProviders(<FlashOnChange value={1}>1</FlashOnChange>)
    rerender(<FlashOnChange value={2}>2</FlashOnChange>)
    const first = flash()

    rerender(<FlashOnChange value={3}>3</FlashOnChange>)

    expect(flash()).not.toBe(first)
    expect(flash()).toHaveAttribute('data-flash', 'true')
  })

  it('uses a CSS animation, not inline styles', () => {
    const { rerender } = renderWithProviders(<FlashOnChange value={1}>1</FlashOnChange>)
    rerender(<FlashOnChange value={2}>2</FlashOnChange>)
    expect(getComputedStyle(flash()).animationName).not.toBe('')
    expect(inlineStyled()).toHaveLength(0)
  })
})
