import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildOrgTreeModel } from '@/entities/org-node/lib/org-tree-model'
import { OrgTree } from '@/widgets/org-tree/org-tree'
import { sampleOrgNodes } from '@/test/fixtures'
import { inlineStyled, renderWithProviders } from '@/test/render'

const model = buildOrgTreeModel(sampleOrgNodes)
const item = (name: string) => screen.getByRole('treeitem', { name: new RegExp(`^${name}`) })
const queryItem = (name: string) => screen.queryByRole('treeitem', { name: new RegExp(`^${name}`) })
const rowOf = (name: string) => within(item(name)).getAllByTestId('org-tree-row')[0]!

const scrollIntoView = vi.fn()
beforeEach(() => {
  Element.prototype.scrollIntoView = scrollIntoView
  scrollIntoView.mockClear()
})
afterEach(() => {
  // @ts-expect-error jsdom does not implement scrollIntoView
  delete Element.prototype.scrollIntoView
})

describe('OrgTree', () => {
  it('renders an accessible tree', () => {
    renderWithProviders(<OrgTree model={model} />)

    expect(screen.getByRole('tree', { name: 'Оргструктура' })).toBeInTheDocument()
    expect(item('Технологии')).toHaveAttribute('aria-level', '1')
    expect(item('Платформа')).toHaveAttribute('aria-level', '2')
  })

  it('shows the second level by default and hides the third', () => {
    renderWithProviders(<OrgTree model={model} />)

    expect(item('Технологии')).toHaveAttribute('aria-expanded', 'true')
    expect(item('Продажи')).toHaveAttribute('aria-expanded', 'true')
    expect(item('Платформа')).toHaveAttribute('aria-expanded', 'false')
    expect(item('Дизайн')).toBeInTheDocument()
    expect(item('Маркетинг')).toBeInTheDocument()
    expect(queryItem('Core API')).not.toBeInTheDocument()
  })

  it('shows name, headcount and a performance indicator for every visible node', () => {
    renderWithProviders(<OrgTree model={model} />)

    const row = rowOf('Платформа')
    expect(row).toHaveTextContent('Платформа')
    expect(row).toHaveTextContent('3 чел.')
    expect(within(row).getByRole('img', { name: 'Эффективность 65 из 100 — средняя' })).toBeInTheDocument()
  })

  it('expands and collapses a branch with the toggle button', async () => {
    const user = userEvent.setup()
    renderWithProviders(<OrgTree model={model} />)

    await user.click(screen.getByRole('button', { name: 'Развернуть «Платформа»' }))
    expect(item('Платформа')).toHaveAttribute('aria-expanded', 'true')
    expect(item('Core API')).toHaveAttribute('aria-level', '3')

    await user.click(screen.getByRole('button', { name: 'Свернуть «Платформа»' }))
    expect(queryItem('Core API')).not.toBeInTheDocument()
  })

  it('hides the whole subtree when a root is collapsed', async () => {
    const user = userEvent.setup()
    renderWithProviders(<OrgTree model={model} />)

    await user.click(screen.getByRole('button', { name: 'Свернуть «Технологии»' }))

    expect(queryItem('Платформа')).not.toBeInTheDocument()
    expect(queryItem('Дизайн')).not.toBeInTheDocument()
    expect(item('Маркетинг')).toBeInTheDocument()
  })

  it('can be operated from the keyboard', async () => {
    const user = userEvent.setup()
    renderWithProviders(<OrgTree model={model} />)

    screen.getByRole('button', { name: 'Развернуть «Платформа»' }).focus()
    await user.keyboard('{Enter}')
    expect(item('Core API')).toBeInTheDocument()

    await user.keyboard(' ')
    expect(queryItem('Core API')).not.toBeInTheDocument()
  })

  it('does not render a toggle for leaf nodes', async () => {
    const user = userEvent.setup()
    renderWithProviders(<OrgTree model={model} />)
    await user.click(screen.getByRole('button', { name: 'Развернуть «Платформа»' }))

    expect(item('Дизайн')).not.toHaveAttribute('aria-expanded')
    expect(screen.queryByRole('button', { name: /«Дизайн»/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /«Core API»/ })).not.toBeInTheDocument()
  })

  it('keeps the expansion state when data is refreshed', async () => {
    const user = userEvent.setup()
    const { rerender } = renderWithProviders(<OrgTree model={model} />)
    await user.click(screen.getByRole('button', { name: 'Развернуть «Платформа»' }))

    const refreshed = buildOrgTreeModel(sampleOrgNodes.map((n) => ({ ...n, headcount: n.headcount + 1 })))
    rerender(<OrgTree model={refreshed} />)

    expect(item('Core API')).toBeInTheDocument()
    expect(rowOf('Платформа')).toHaveTextContent('4 чел.')
  })

  describe('selection', () => {
    it('marks only the selected node', () => {
      renderWithProviders(<OrgTree model={model} selectedId="d1-2" />)

      expect(item('Дизайн')).toHaveAttribute('aria-selected', 'true')
      expect(item('Платформа')).toHaveAttribute('aria-selected', 'false')
      expect(screen.getAllByRole('treeitem', { selected: true })).toHaveLength(1)
    })

    it('expands all ancestors of a hidden selected node and scrolls it into view', () => {
      renderWithProviders(<OrgTree model={model} selectedId="d1-1-1" />)

      expect(item('Платформа')).toHaveAttribute('aria-expanded', 'true')
      expect(item('Core API')).toHaveAttribute('aria-selected', 'true')
      expect(scrollIntoView).toHaveBeenCalledTimes(1)
      expect(scrollIntoView.mock.contexts[0]).toBe(rowOf('Core API'))
    })

    it('reveals ancestors again when the selection changes, even if a branch was collapsed', async () => {
      const user = userEvent.setup()
      const { rerender } = renderWithProviders(<OrgTree model={model} selectedId={null} />)
      await user.click(screen.getByRole('button', { name: 'Свернуть «Продажи»' }))
      expect(queryItem('Маркетинг')).not.toBeInTheDocument()

      rerender(<OrgTree model={model} selectedId="d2-1" />)

      expect(item('Маркетинг')).toHaveAttribute('aria-selected', 'true')
    })

    it('clears the highlight when the selection is removed, keeping revealed branches open', () => {
      const { rerender } = renderWithProviders(<OrgTree model={model} selectedId="d1-1-1" />)

      rerender(<OrgTree model={model} selectedId={null} />)

      expect(screen.queryAllByRole('treeitem', { selected: true })).toHaveLength(0)
      expect(item('Core API')).toBeInTheDocument()
    })

    it('reveals the same node again after it was deselected and its branch collapsed', async () => {
      const user = userEvent.setup()
      const { rerender } = renderWithProviders(<OrgTree model={model} selectedId="d1-1-1" />)
      rerender(<OrgTree model={model} selectedId={null} />)
      await user.click(screen.getByRole('button', { name: 'Свернуть «Платформа»' }))

      rerender(<OrgTree model={model} selectedId="d1-1-1" />)

      expect(item('Core API')).toHaveAttribute('aria-selected', 'true')
    })

    it('still lets the user collapse an ancestor of the selected node', async () => {
      const user = userEvent.setup()
      renderWithProviders(<OrgTree model={model} selectedId="d1-1-1" />)

      await user.click(screen.getByRole('button', { name: 'Свернуть «Платформа»' }))
      expect(queryItem('Core API')).not.toBeInTheDocument()
    })

    it('scrolls without animation when the user prefers reduced motion', () => {
      const original = window.matchMedia
      window.matchMedia = (query: string) => ({ ...original(query), matches: query.includes('prefers-reduced-motion') })
      try {
        renderWithProviders(<OrgTree model={model} selectedId="d1-2" />)
        expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', behavior: 'auto' })
      } finally {
        window.matchMedia = original
      }
    })

    it('scrolls smoothly otherwise', () => {
      renderWithProviders(<OrgTree model={model} selectedId="d1-2" />)
      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', behavior: 'smooth' })
    })
  })

  describe('clicking a tree element', () => {
    it('expands a collapsed branch when anywhere on its row is clicked', async () => {
      const user = userEvent.setup()
      renderWithProviders(<OrgTree model={model} />)

      await user.click(within(rowOf('Платформа')).getByText('3 чел.'))

      expect(item('Платформа')).toHaveAttribute('aria-expanded', 'true')
      expect(item('Core API')).toBeInTheDocument()
    })

    it('collapses an expanded branch on the next click', async () => {
      const user = userEvent.setup()
      renderWithProviders(<OrgTree model={model} />)

      await user.click(rowOf('Технологии'))

      expect(item('Технологии')).toHaveAttribute('aria-expanded', 'false')
      expect(queryItem('Платформа')).not.toBeInTheDocument()
    })

    it('expands and selects at the same time when the tree is selectable', async () => {
      const user = userEvent.setup()
      const onSelect = vi.fn()
      renderWithProviders(<OrgTree model={model} onSelect={onSelect} />)

      await user.click(rowOf('Платформа'))

      expect(onSelect).toHaveBeenCalledTimes(1)
      expect(onSelect).toHaveBeenCalledWith('d1-1')
      expect(item('Core API')).toBeInTheDocument()
    })

    it('toggles exactly once when the name is clicked', async () => {
      const user = userEvent.setup()
      const onSelect = vi.fn()
      renderWithProviders(<OrgTree model={model} onSelect={onSelect} />)

      await user.click(screen.getByRole('button', { name: 'Платформа' }))

      expect(onSelect).toHaveBeenCalledTimes(1)
      expect(item('Платформа')).toHaveAttribute('aria-expanded', 'true')
    })

    it('toggles exactly once when the arrow is clicked, without selecting', async () => {
      const user = userEvent.setup()
      const onSelect = vi.fn()
      renderWithProviders(<OrgTree model={model} onSelect={onSelect} />)

      await user.click(screen.getByRole('button', { name: 'Развернуть «Платформа»' }))

      expect(item('Платформа')).toHaveAttribute('aria-expanded', 'true')
      expect(onSelect).not.toHaveBeenCalled()
    })

    it('only selects a leaf node (nothing to expand)', async () => {
      const user = userEvent.setup()
      const onSelect = vi.fn()
      renderWithProviders(<OrgTree model={model} onSelect={onSelect} />)

      await user.click(rowOf('Дизайн'))

      expect(onSelect).toHaveBeenCalledWith('d1-2')
      expect(item('Дизайн')).not.toHaveAttribute('aria-expanded')
    })

    it('lets keyboard users expand and select a node with Tab + Enter on its name', async () => {
      const user = userEvent.setup()
      const onSelect = vi.fn()
      renderWithProviders(<OrgTree model={model} onSelect={onSelect} />)

      screen.getByRole('button', { name: 'Платформа' }).focus()
      await user.keyboard('{Enter}')

      expect(onSelect).toHaveBeenCalledWith('d1-1')
      expect(item('Core API')).toBeInTheDocument()
    })

    it('shows that the whole row is interactive', () => {
      renderWithProviders(<OrgTree model={model} />)
      expect(getComputedStyle(rowOf('Платформа')).cursor).toBe('pointer')
    })

    it('keeps the tree accessible name of each item equal to the node name', () => {
      renderWithProviders(<OrgTree model={model} onSelect={vi.fn()} />)
      expect(screen.getByRole('treeitem', { name: 'Платформа' })).toBeInTheDocument()
    })
  })

  it('uses no inline CSS', () => {
    renderWithProviders(<OrgTree model={model} selectedId="d1-1" />)
    expect(inlineStyled()).toHaveLength(0)
  })
})
