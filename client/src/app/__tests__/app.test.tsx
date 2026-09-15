import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '@/app/app'
import { sampleOrgNodes } from '@/test/fixtures'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(Response.json(sampleOrgNodes)))
  Element.prototype.scrollIntoView = vi.fn()
})

describe('App', () => {
  it('renders the dashboard shell', async () => {
    render(<App />)

    expect(screen.getByRole('banner')).toHaveTextContent('Staff Pulse')
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(await screen.findByRole('tree', { name: 'Оргструктура' })).toBeInTheDocument()
  })
})
