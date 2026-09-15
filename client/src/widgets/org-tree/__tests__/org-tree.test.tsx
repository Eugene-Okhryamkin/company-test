import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { OrgTree } from '@/widgets/org-tree/org-tree'
import { sampleOrgNodes } from '@/test/fixtures'
import { inlineStyled, renderWithProviders } from '@/test/render'

const item = (name: string) => screen.getByRole('treeitem', { name: new RegExp(`^${name}`) })
const queryItem = (name: string) => screen.queryByRole('treeitem', { name: new RegExp(`^${name}`) })

describe('OrgTree', () => {
  it('renders an accessible tree', () => {
    renderWithProviders(<OrgTree nodes={sampleOrgNodes} />)

    expect(screen.getByRole('tree', { name: 'Оргструктура' })).toBeInTheDocument()
    expect(item('Технологии')).toHaveAttribute('aria-level', '1')
    expect(item('Платформа')).toHaveAttribute('aria-level', '2')
  })

  it('shows the second level by default and hides the third', () => {
    renderWithProviders(<OrgTree nodes={sampleOrgNodes} />)

    expect(item('Технологии')).toHaveAttribute('aria-expanded', 'true')
    expect(item('Продажи')).toHaveAttribute('aria-expanded', 'true')
    expect(item('Платформа')).toHaveAttribute('aria-expanded', 'false')
    expect(item('Дизайн')).toBeInTheDocument()
    expect(item('Маркетинг')).toBeInTheDocument()
    expect(queryItem('Core API')).not.toBeInTheDocument()
  })

  it('shows name, headcount and a performance indicator for every visible node', () => {
    renderWithProviders(<OrgTree nodes={sampleOrgNodes} />)

    const platform = item('Платформа')
    const row = within(platform).getAllByTestId('org-tree-row')[0]!
    expect(row).toHaveTextContent('Платформа')
    expect(row).toHaveTextContent('3 чел.')
    expect(within(row).getByRole('img', { name: 'Эффективность 65 из 100 — средняя' })).toBeInTheDocument()
  })

  it('expands and collapses a branch with the toggle button', async () => {
    const user = userEvent.setup()
    renderWithProviders(<OrgTree nodes={sampleOrgNodes} />)

    await user.click(screen.getByRole('button', { name: 'Развернуть «Платформа»' }))
    expect(item('Платформа')).toHaveAttribute('aria-expanded', 'true')
    expect(item('Core API')).toHaveAttribute('aria-level', '3')

    await user.click(screen.getByRole('button', { name: 'Свернуть «Платформа»' }))
    expect(queryItem('Core API')).not.toBeInTheDocument()
  })

  it('hides the whole subtree when a root is collapsed', async () => {
    const user = userEvent.setup()
    renderWithProviders(<OrgTree nodes={sampleOrgNodes} />)

    await user.click(screen.getByRole('button', { name: 'Свернуть «Технологии»' }))

    expect(queryItem('Платформа')).not.toBeInTheDocument()
    expect(queryItem('Дизайн')).not.toBeInTheDocument()
    expect(item('Маркетинг')).toBeInTheDocument()
  })

  it('can be operated from the keyboard', async () => {
    const user = userEvent.setup()
    renderWithProviders(<OrgTree nodes={sampleOrgNodes} />)

    screen.getByRole('button', { name: 'Развернуть «Платформа»' }).focus()
    await user.keyboard('{Enter}')
    expect(item('Core API')).toBeInTheDocument()

    await user.keyboard(' ')
    expect(queryItem('Core API')).not.toBeInTheDocument()
  })

  it('does not render a toggle for leaf nodes', async () => {
    const user = userEvent.setup()
    renderWithProviders(<OrgTree nodes={sampleOrgNodes} />)
    await user.click(screen.getByRole('button', { name: 'Развернуть «Платформа»' }))

    expect(item('Дизайн')).not.toHaveAttribute('aria-expanded')
    expect(screen.queryByRole('button', { name: /«Дизайн»/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /«Core API»/ })).not.toBeInTheDocument()
  })

  it('keeps the expansion state when data is refreshed', async () => {
    const user = userEvent.setup()
    const { rerender } = renderWithProviders(<OrgTree nodes={sampleOrgNodes} />)
    await user.click(screen.getByRole('button', { name: 'Развернуть «Платформа»' }))

    rerender(<OrgTree nodes={sampleOrgNodes.map((n) => ({ ...n, headcount: n.headcount + 1 }))} />)

    expect(item('Core API')).toBeInTheDocument()
    expect(within(item('Платформа')).getAllByTestId('org-tree-row')[0]).toHaveTextContent('4 чел.')
  })

  it('uses no inline CSS', () => {
    renderWithProviders(<OrgTree nodes={sampleOrgNodes} />)
    expect(inlineStyled()).toHaveLength(0)
  })
})
