import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '@/app/app'
import { sampleOrgNodes } from '@/test/fixtures'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(Response.json(sampleOrgNodes)))
})

describe('App', () => {
  it('renders the dashboard shell with the org tree', async () => {
    render(<App />)

    expect(screen.getByRole('banner')).toHaveTextContent('Staff Pulse')
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(await screen.findByRole('tree', { name: 'Оргструктура' })).toBeInTheDocument()
  })
})
