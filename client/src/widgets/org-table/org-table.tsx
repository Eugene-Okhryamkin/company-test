import { memo, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import type { OrgTableRow } from '@/entities/org-node/lib/org-tree-model'
import { PerformanceIndicator } from '@/entities/org-node/ui/performance-indicator'
import { formatNumber, formatPerformance, formatRub } from '@/shared/lib/format'
import { prefersReducedMotion } from '@/shared/lib/prefers-reduced-motion'
import { useDebouncedValue } from '@/shared/lib/use-debounced-value'
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

const ARIA_SORT = { asc: 'ascending', desc: 'descending' } as const
const SORT_HINT = 'Клик — сортировка, повторный или двойной клик — обратный порядок'

interface OrgTableProps {
  rows: readonly OrgTableRow[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function OrgTable({ rows, selectedId, onSelect }: OrgTableProps) {
  const [sort, setSort] = useState<SortState>(null)
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, FILTER_DEBOUNCE_MS)

  const visibleRows = useMemo(
    () => sortRows(filterRowsByName(rows, debouncedQuery), sort),
    [rows, debouncedQuery, sort],
  )

  const handleHeaderClick = (event: MouseEvent<HTMLButtonElement>, key: SortKey) => {
    // The second click of a double click (detail 2+) is ignored: the first click already reversed
    // the active column, so a double click re-sorts exactly once. Keyboard activation has detail 0.
    if (event.detail > 1) return
    setSort((current) => applySortToggle(current, key))
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

      <Table role="grid" aria-label="Аналитика по подразделениям">
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
              <EmptyCell role="gridcell" colSpan={COLUMNS.length}>Ничего не найдено по запросу «{debouncedQuery.trim()}»</EmptyCell>
            </tr>
          ) : (
            visibleRows.map((row) => (
              <TableRow key={row.id} row={row} selected={row.id === selectedId} onSelect={onSelect} />
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
  onSelect: (id: string) => void
}

/** Memoised: changing the selection or sort re-renders only the rows whose props changed. */
const TableRow = memo(function TableRow({ row, selected, onSelect }: TableRowProps) {
  const ref = useRef<HTMLTableRowElement>(null)

  useEffect(() => {
    // Selection may come from the tree: bring the row into view ("nearest" = no jump if already visible).
    if (selected) ref.current?.scrollIntoView?.({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }, [selected])

  return (
    <BodyRow ref={ref} aria-selected={selected} $selected={selected} onClick={() => onSelect(row.id)}>
      <Cell role="gridcell" $align="start">{row.name}</Cell>
      <Cell role="gridcell" $align="end">{row.level}</Cell>
      <Cell role="gridcell" $align="end">{formatNumber(row.totalHeadcount)}</Cell>
      <Cell role="gridcell" $align="end">{formatRub(row.totalBudget)}</Cell>
      <Cell role="gridcell" $align="end">
        <PerformanceValue>
          {formatPerformance(row.avgPerformance)}
          <PerformanceIndicator value={row.avgPerformance} />
        </PerformanceValue>
      </Cell>
    </BodyRow>
  )
})
