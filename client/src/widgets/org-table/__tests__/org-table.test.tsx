import { act, fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildOrgTreeModel } from '@/entities/org-node/lib/org-tree-model'
import { FILTER_DEBOUNCE_MS, OrgTable } from '@/widgets/org-table/org-table'
import { sampleOrgNodes } from '@/test/fixtures'
import { inlineStyled, renderWithProviders } from '@/test/render'

const { rows } = buildOrgTreeModel(sampleOrgNodes)
// Subtree headcounts: Технологии 21, Платформа 12, Core API 9, Дизайн 5, Продажи 5, Маркетинг 2

const table = () => screen.getByRole('grid', { name: 'Аналитика по подразделениям' })
const bodyRows = () => within(table()).getAllByRole('row').slice(1)
const rowNames = () => bodyRows().map((row) => within(row).getAllByRole('gridcell')[0]!.textContent)
const header = (name: string) => screen.getByRole('columnheader', { name: new RegExp(name) })
const sortButton = (name: string) => within(header(name)).getByRole('button')

const renderTable = (props: Partial<Parameters<typeof OrgTable>[0]> = {}) =>
  renderWithProviders(<OrgTable rows={rows} selectedId={null} onSelect={vi.fn()} {...props} />)

/**
 * Types keystroke by keystroke under fake timers. user-event is not used here: Testing Library's
 * async wrapper waits on a real setTimeout, which never fires while Vitest fakes timers.
 */
const typeInto = (input: HTMLElement, text: string) => {
  for (let length = 1; length <= text.length; length += 1) {
    fireEvent.change(input, { target: { value: text.slice(0, length) } })
  }
}
const searchbox = () => screen.getByRole('searchbox', { name: 'Фильтр по названию' })

const scrollIntoView = vi.fn()
beforeEach(() => {
  Element.prototype.scrollIntoView = scrollIntoView
  scrollIntoView.mockClear()
})
afterEach(() => {
  vi.useRealTimers()
  // @ts-expect-error jsdom does not implement scrollIntoView
  delete Element.prototype.scrollIntoView
})

describe('OrgTable', () => {
  it('has the required columns in order', () => {
    renderTable()
    expect(within(table()).getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
      'Подразделение',
      'Уровень',
      'Всего сотрудников',
      'Бюджет суммарный',
      'Средняя эффективность',
    ])
  })

  it('lists every unit in hierarchy order by default', () => {
    renderTable()
    expect(rowNames()).toEqual(['Технологии', 'Платформа', 'Core API', 'Дизайн', 'Продажи', 'Маркетинг'])
    expect(header('Подразделение')).toHaveAttribute('aria-sort', 'none')
  })

  it('shows subtree aggregates with the required formatting', () => {
    renderTable()
    const cellsOf = (index: number) =>
      within(bodyRows()[index]!).getAllByRole('gridcell').map((cell) => cell.textContent)

    // Технологии: 4+3+9+5 people, 4 × 1 000 000 budget, weighted performance 1333/21
    expect(cellsOf(0)).toEqual(['Технологии', '1', '21', '4 000 000 руб.', '63,5'])
    expect(cellsOf(2)).toEqual(['Core API', '3', '9', '1 000 000 руб.', '40,0'])
    expect(cellsOf(4)).toEqual(['Продажи', '1', '5', '2 000 000 руб.', '63,0'])
  })

  describe('sorting', () => {
    it('sorts ascending by the clicked column', async () => {
      const user = userEvent.setup()
      renderTable()

      await user.click(sortButton('Всего сотрудников'))

      expect(rowNames()).toEqual(['Маркетинг', 'Дизайн', 'Продажи', 'Core API', 'Платформа', 'Технологии'])
      expect(header('Всего сотрудников')).toHaveAttribute('aria-sort', 'ascending')
      expect(header('Подразделение')).toHaveAttribute('aria-sort', 'none')
    })

    it('reverses the order on a second click of the active column (ties stay in hierarchy order)', async () => {
      const user = userEvent.setup()
      renderTable()

      await user.click(sortButton('Всего сотрудников'))
      await user.click(sortButton('Всего сотрудников'))

      expect(rowNames()).toEqual(['Технологии', 'Платформа', 'Core API', 'Дизайн', 'Продажи', 'Маркетинг'])
      expect(header('Всего сотрудников')).toHaveAttribute('aria-sort', 'descending')

      await user.click(sortButton('Всего сотрудников'))
      expect(header('Всего сотрудников')).toHaveAttribute('aria-sort', 'ascending')
    })

    it('reverses the order on double click of the active column, re-sorting only once', async () => {
      const user = userEvent.setup()
      renderTable()
      await user.click(sortButton('Бюджет суммарный'))

      const seen: (string | null)[] = []
      const observer = new MutationObserver(() => seen.push(header('Бюджет суммарный').getAttribute('aria-sort')))
      observer.observe(header('Бюджет суммарный'), { attributes: true, attributeFilter: ['aria-sort'] })
      await user.dblClick(sortButton('Бюджет суммарный'))
      observer.disconnect()

      expect(header('Бюджет суммарный')).toHaveAttribute('aria-sort', 'descending')
      expect(seen).toEqual(['descending'])
    })

    it('a double click on a new column sorts it ascending without flipping back and forth', async () => {
      const user = userEvent.setup()
      renderTable()

      await user.dblClick(sortButton('Уровень'))

      expect(header('Уровень')).toHaveAttribute('aria-sort', 'ascending')
    })

    it('switching to another column starts ascending again', async () => {
      const user = userEvent.setup()
      renderTable()

      await user.click(sortButton('Уровень'))
      await user.click(sortButton('Уровень'))
      await user.click(sortButton('Подразделение'))

      expect(header('Подразделение')).toHaveAttribute('aria-sort', 'ascending')
      expect(header('Уровень')).toHaveAttribute('aria-sort', 'none')
    })

    it('sorts by name with Russian collation', async () => {
      const user = userEvent.setup()
      renderTable()

      await user.click(sortButton('Подразделение'))
      expect(rowNames()).toEqual(['Дизайн', 'Маркетинг', 'Платформа', 'Продажи', 'Технологии', 'Core API'])
    })

    it('sorts by average performance', async () => {
      const user = userEvent.setup()
      renderTable()

      await user.click(sortButton('Средняя эффективность'))
      await user.click(sortButton('Средняя эффективность'))
      expect(rowNames()).toEqual(['Дизайн', 'Маркетинг', 'Технологии', 'Продажи', 'Платформа', 'Core API'])
    })

    it('is keyboard accessible: Enter sorts, Enter again reverses', async () => {
      const user = userEvent.setup()
      renderTable()

      sortButton('Уровень').focus()
      await user.keyboard('{Enter}')
      expect(header('Уровень')).toHaveAttribute('aria-sort', 'ascending')

      await user.keyboard('{Enter}')
      expect(header('Уровень')).toHaveAttribute('aria-sort', 'descending')
    })

    it('Space works like Enter; other keys do not change the order', async () => {
      const user = userEvent.setup()
      renderTable()

      sortButton('Уровень').focus()
      await user.keyboard(' ')
      expect(header('Уровень')).toHaveAttribute('aria-sort', 'ascending')

      await user.keyboard('{ArrowDown}a{Escape}')
      expect(header('Уровень')).toHaveAttribute('aria-sort', 'ascending')

      await user.keyboard(' ')
      expect(header('Уровень')).toHaveAttribute('aria-sort', 'descending')
    })

    it('names each sort button after its column and describes the interaction separately', () => {
      renderTable()
      const button = screen.getByRole('button', { name: 'Уровень' })
      expect(button).toHaveAccessibleDescription('Клик — сортировка, повторный или двойной клик — обратный порядок')
      expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual([
        'Подразделение',
        'Уровень',
        'Всего сотрудников',
        'Бюджет суммарный',
        'Средняя эффективность',
      ])
    })
  })

  describe('filter by name', () => {
    it('filters in real time after a 250 ms debounce', () => {
      expect(FILTER_DEBOUNCE_MS).toBe(250)
      vi.useFakeTimers()
      renderTable()

      typeInto(searchbox(), 'плат')
      act(() => vi.advanceTimersByTime(FILTER_DEBOUNCE_MS - 1))
      expect(rowNames()).toHaveLength(6)
      expect(searchbox()).toHaveValue('плат')

      act(() => vi.advanceTimersByTime(1))
      expect(rowNames()).toEqual(['Платформа'])
      expect(screen.getByText('Показано 1 из 6')).toBeInTheDocument()
    })

    it('restarts the debounce while the user keeps typing', () => {
      vi.useFakeTimers()
      renderTable()

      typeInto(searchbox(), 'п')
      act(() => vi.advanceTimersByTime(200))
      typeInto(searchbox(), 'пр')
      act(() => vi.advanceTimersByTime(200))
      expect(rowNames()).toHaveLength(6)

      act(() => vi.advanceTimersByTime(50))
      expect(rowNames()).toEqual(['Продажи'])
    })

    it('applies the filter on top of the current sort', async () => {
      const user = userEvent.setup()
      renderTable()
      await user.click(sortButton('Всего сотрудников'))
      await user.click(sortButton('Всего сотрудников'))

      vi.useFakeTimers()
      typeInto(searchbox(), 'а')
      act(() => vi.advanceTimersByTime(FILTER_DEBOUNCE_MS))

      expect(rowNames()).toEqual(['Платформа', 'Дизайн', 'Продажи', 'Маркетинг'])
    })

    it('shows a message when nothing matches', () => {
      vi.useFakeTimers()
      renderTable()

      typeInto(searchbox(), 'бухгалтерия')
      act(() => vi.advanceTimersByTime(FILTER_DEBOUNCE_MS))

      expect(screen.getByText('Ничего не найдено по запросу «бухгалтерия»')).toBeInTheDocument()
      expect(screen.getByText('Показано 0 из 6')).toBeInTheDocument()
    })
  })

  describe('selection', () => {
    it('reports the clicked row', async () => {
      const user = userEvent.setup()
      const onSelect = vi.fn()
      renderTable({ onSelect })

      await user.click(screen.getByRole('gridcell', { name: 'Платформа' }))
      expect(onSelect).toHaveBeenCalledWith('d1-1')
    })

    it('scrolls the row selected elsewhere (e.g. in the tree) into view', () => {
      const { rerender } = renderTable({ selectedId: null })

      rerender(<OrgTable rows={rows} selectedId="d2-1" onSelect={vi.fn()} />)

      expect(scrollIntoView).toHaveBeenCalledTimes(1)
      expect(scrollIntoView.mock.contexts[0]).toHaveTextContent('Маркетинг')
    })

    it('scrolls without animation when the user prefers reduced motion', () => {
      const original = window.matchMedia
      window.matchMedia = (query: string) => ({ ...original(query), matches: query.includes('prefers-reduced-motion') })
      try {
        renderTable({ selectedId: 'd2' })
        expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', behavior: 'auto' })
      } finally {
        window.matchMedia = original
      }
    })

    it('highlights the selected row', () => {
      renderTable({ selectedId: 'd2' })

      const selected = within(table()).getAllByRole('row', { selected: true })
      expect(selected).toHaveLength(1)
      expect(selected[0]).toHaveTextContent('Продажи')
    })
  })

  it('uses no inline CSS', () => {
    renderTable({ selectedId: 'd1' })
    expect(inlineStyled()).toHaveLength(0)
  })
})
