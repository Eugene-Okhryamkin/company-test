import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useTheme } from 'styled-components'
import { AppProviders } from '@/app/app-providers'
import { queryClient } from '@/app/query-client'
import { createQueryClient } from '@/shared/api/query-client'
import { theme } from '@/shared/styles/theme'

function Probe({ expectedClient }: { expectedClient: QueryClient }) {
  const client = useQueryClient()
  const currentTheme = useTheme()
  return (
    <output>
      {client === expectedClient ? 'client-ok' : 'client-mismatch'} {currentTheme === theme ? 'theme-ok' : 'theme-mismatch'}
    </output>
  )
}

/** styled-components may inject via text nodes or via CSSOM insertRule — read both. */
const injectedCss = () =>
  [
    ...[...document.querySelectorAll('style')].map((style) => style.textContent ?? ''),
    ...[...document.styleSheets].flatMap((sheet) => [...sheet.cssRules].map((rule) => rule.cssText)),
  ].join('\n')

describe('AppProviders', () => {
  it('configures the app-wide query client with the project defaults', () => {
    expect(queryClient.getDefaultOptions().queries?.staleTime).toBe(5_000)
  })

  it('provides the app-wide query client and theme by default', () => {
    render(
      <AppProviders>
        <Probe expectedClient={queryClient} />
      </AppProviders>,
    )
    expect(screen.getByRole('status')).toHaveTextContent('client-ok theme-ok')
  })

  it('accepts a custom query client', () => {
    const client = createQueryClient()
    render(
      <AppProviders client={client}>
        <Probe expectedClient={client} />
      </AppProviders>,
    )
    expect(screen.getByRole('status')).toHaveTextContent('client-ok')
  })

  it('injects global styles from the theme, including reduced-motion support', () => {
    render(<AppProviders>content</AppProviders>)

    const css = injectedCss()
    expect(css).toMatch(/box-sizing:\s*border-box/)
    expect(css).toContain('system-ui')
    expect(css).toMatch(/prefers-reduced-motion/)
  })
})
