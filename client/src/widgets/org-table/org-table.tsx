import { memo, useEffect, useMemo, useRef, useState, type FocusEvent, type KeyboardEvent, type MouseEvent } from 'react'
import type { OrgTableRow } from '@/entities/org-node/lib/org-tree-model'
import { PerformanceIndicator } from '@/entities/org-node/ui/performance-indicator'
import { formatNumber, formatPerformance, formatRub } from '@/shared/lib/format'
import { prefersReducedMotion } from '@/shared/lib/prefers-reduced-motion'
import { useDebouncedValue } from '@/shared/lib/use-debounced-value'
import { FlashOnChange } from '@/shared/ui/flash-on-change'
import { filterRowsByName } from '@/widgets/org-table/lib/filter-rows'
import { applySortToggle, sortRows, type SortKey, type SortState } from '@/widgets/org-table/lib/sort-rows'
import {
  BodyRow,
  Cell,
  Count,
  EmptyCell,
  HeaderCell,
  PerformanceValue,
  SearchInput,
  SortButton,
  Table,
  Toolbar,
} from '@/widgets/org-table/org-table.styles'

export const FILTER_DEBOUNCE_MS = 250

interface Column {
  key: SortKey
  title: string
  align: 'start' | 'end'
}

const COLUMNS: readonly Column[] = [
  { key: 'name', title: 'Подразделение', align: 'start' },
  { key: 'level', title: 'Уровень', align: 'end' },
  { key: 'totalHeadcount', title: 'Всего сотрудников', align: 'end' },
  { key: 'totalBudget', title: 'Бюджет суммарный', align: 'end' },
  { key: 'avgPerformance', title: 'Средняя эффективность', align: 'end' },
]
const LAST_COLUMN = COLUMNS.length - 1

const ARIA_SORT = { asc: 'ascending', desc: 'descending' } as const
const SORT_HINT = 'Клик — сортировка, повторный или двойной клик — обратный порядок'

interface ActiveCell {
  rowId: string | null
  col: number
}

interface OrgTableProps {
  rows: readonly OrgTableRow[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function OrgTable({ rows, selectedId, onSelect }: OrgTableProps) {
  const [sort, setSort] = useState<SortState>(null)
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, FILTER_DEBOUNCE_MS)
  const tableRef = useRef<HTMLTableElement>(null)

  const visibleRows = useMemo(
    () => sortRows(filterRowsByName(rows, debouncedQuery), sort),
    [rows, debouncedQuery, sort],
  )

  // Roving tabindex: exactly one cell of the grid is tabbable.
  const [active, setActive] = useState<ActiveCell>({ rowId: selectedId, col: 0 })
  const [previousSelectedId, setPreviousSelectedId] = useState(selectedId)
  if (selectedId !== previousSelectedId) {
    // A node picked elsewhere (e.g. in the tree) becomes the keyboard position, without moving focus.
    setPreviousSelectedId(selectedId)
    if (selectedId !== null) setActive((current) => ({ ...current, rowId: selectedId }))
  }
  const activeRowId = visibleRows.some((row) => row.id === active.rowId) ? active.rowId : (visibleRows[0]?.id ?? null)

  const handleHeaderClick = (event: MouseEvent<HTMLButtonElement>, key: SortKey) => {
    // The second click of a double click (detail 2+) is ignored: the first click already reversed
    // the active column, so a double click re-sorts exactly once. Keyboard activation has detail 0.
    if (event.detail > 1) return
    setSort((current) => applySortToggle(current, key))
  }

  const focusCell = (rowId: string, col: number) => {
    setActive({ rowId, col })
    tableRef.current?.querySelector<HTMLElement>(`[data-row-id="${CSS.escape(rowId)}"] [data-col="${col}"]`)?.focus()
  }

  const handleGridKeyDown = (event: KeyboardEvent<HTMLTableElement>) => {
    const cell = (event.target as HTMLElement).closest<HTMLElement>('[data-col]')
    const rowId = cell?.closest<HTMLElement>('[data-row-id]')?.dataset.rowId
    if (!cell || rowId === undefined) return // header, empty state…

    const rowIndex = visibleRows.findIndex((row) => row.id === rowId)
    const col = Number(cell.dataset.col)
    const lastRow = visibleRows.length - 1
    const target: Record<string, [row: number, col: number]> = {
      ArrowDown: [Math.min(rowIndex + 1, lastRow), col],
      ArrowUp: [Math.max(rowIndex - 1, 0), col],
      ArrowRight: [rowIndex, Math.min(col + 1, LAST_COLUMN)],
      ArrowLeft: [rowIndex, Math.max(col - 1, 0)],
      Home: [0, col],
      End: [lastRow, col],
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      onSelect(rowId)
      return
    }
    const next = target[event.key]
    if (!next) return
    event.preventDefault()
    focusCell(visibleRows[next[0]]!.id, next[1])
  }

  const handleGridFocus = (event: FocusEvent<HTMLTableElement>) => {
    const cell = (event.target as HTMLElement).closest<HTMLElement>('[data-col]')
    const rowId = cell?.closest<HTMLElement>('[data-row-id]')?.dataset.rowId
    if (cell && rowId !== undefined) setActive({ rowId, col: Number(cell.dataset.col) })
  }

  return (
    <>
      <Toolbar>
        <SearchInput
          type="search"
          aria-label="Фильтр по названию"
          placeholder="Поиск по названию…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Count aria-live="polite">
          Показано {visibleRows.length} из {rows.length}
        </Count>
      </Toolbar>

      <Table
        ref={tableRef}
        role="grid"
        aria-label="Аналитика по подразделениям"
        onKeyDown={handleGridKeyDown}
        onFocus={handleGridFocus}
      >
        <thead>
          <tr>
            {COLUMNS.map((column) => {
              const direction = sort?.key === column.key ? sort.direction : null
              return (
                <HeaderCell
                  key={column.key}
                  scope="col"
                  aria-sort={direction ? ARIA_SORT[direction] : 'none'}
                  $align={column.align}
                >
                  <SortButton
                    type="button"
                    title={SORT_HINT}
                    $align={column.align}
                    $direction={direction}
                    onClick={(event) => handleHeaderClick(event, column.key)}
                  >
                    {column.title}
                  </SortButton>
                </HeaderCell>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {visibleRows.length === 0 ? (
            <tr>
              <EmptyCell role="gridcell" colSpan={COLUMNS.length}>
                Ничего не найдено по запросу «{debouncedQuery.trim()}»
              </EmptyCell>
            </tr>
          ) : (
            visibleRows.map((row) => (
              <TableRow
                key={row.id}
                row={row}
                selected={row.id === selectedId}
                tabbableCol={row.id === activeRowId ? active.col : null}
                onSelect={onSelect}
              />
            ))
          )}
        </tbody>
      </Table>
    </>
  )
}

interface TableRowProps {
  row: OrgTableRow
  selected: boolean
  /** Column index of the grid's single tab stop if it is in this row. */
  tabbableCol: number | null
  onSelect: (id: string) => void
}

/** Memoised: a live patch or a selection change re-renders only rows whose props changed. */
const TableRow = memo(function TableRow({ row, selected, tabbableCol, onSelect }: TableRowProps) {
  const ref = useRef<HTMLTableRowElement>(null)

  useEffect(() => {
    // Selection may come from the tree: bring the row into view ("nearest" = no jump if already visible).
    if (selected) ref.current?.scrollIntoView?.({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }, [selected])

  const cellProps = (col: number) => ({ role: 'gridcell', 'data-col': col, tabIndex: tabbableCol === col ? 0 : -1 })
  const headcount = formatNumber(row.totalHeadcount)
  const budget = formatRub(row.totalBudget)
  const performance = formatPerformance(row.avgPerformance)

  return (
    <BodyRow ref={ref} data-row-id={row.id} aria-selected={selected} $selected={selected} onClick={() => onSelect(row.id)}>
      <Cell {...cellProps(0)} $align="start">
        {row.name}
      </Cell>
      <Cell {...cellProps(1)} $align="end">
        {row.level}
      </Cell>
      <Cell {...cellProps(2)} $align="end">
        <FlashOnChange value={headcount}>{headcount}</FlashOnChange>
      </Cell>
      <Cell {...cellProps(3)} $align="end">
        <FlashOnChange value={budget}>{budget}</FlashOnChange>
      </Cell>
      <Cell {...cellProps(4)} $align="end">
        <PerformanceValue>
          <FlashOnChange value={performance}>{performance}</FlashOnChange>
          <PerformanceIndicator value={row.avgPerformance} />
        </PerformanceValue>
      </Cell>
    </BodyRow>
  )
})
