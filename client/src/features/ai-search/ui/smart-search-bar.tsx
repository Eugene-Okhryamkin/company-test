import type { ReactNode } from 'react'
import { describeSearchFilter } from '@/features/ai-search/lib/describe-search-filter'
import type { SmartSearch } from '@/features/ai-search/model/use-smart-search'
import {
  AiButton,
  AppliedFilter,
  Chip,
  Chips,
  Notice,
  ResetButton,
  SearchForm,
  SearchInput,
} from '@/features/ai-search/ui/smart-search-bar.styles'

const AI_PLACEHOLDER = 'Название или запрос на естественном языке + Enter'
const TEXT_PLACEHOLDER = 'Поиск по названию…'

interface SmartSearchBarProps {
  search: SmartSearch
  /** Rendered on the input row, before the applied conditions (e.g. a result counter). */
  children?: ReactNode
}

/** Search input with optional AI submit; renders the understood conditions and fallback notices. */
export function SmartSearchBar({ search, children }: SmartSearchBarProps) {
  const { query, aiEnabled, aiFilter, isInterpreting, notice } = search

  return (
    <>
      <SearchForm
        role="search"
        onSubmit={(event) => {
          event.preventDefault()
          search.submit()
        }}
      >
        <SearchInput
          type="search"
          aria-label="Поиск подразделений"
          placeholder={aiEnabled ? AI_PLACEHOLDER : TEXT_PLACEHOLDER}
          value={query}
          onChange={(event) => search.setQuery(event.target.value)}
        />
        {aiEnabled && (
          <AiButton type="submit" disabled={isInterpreting || query.trim() === ''} aria-busy={isInterpreting}>
            {isInterpreting ? 'Думаю…' : 'AI-поиск'}
          </AiButton>
        )}
      </SearchForm>
      {children}

      {aiFilter && (
        <AppliedFilter aria-label="AI-фильтр">
          <Chips>
            {describeSearchFilter(aiFilter.filter).map((item) => (
              <Chip key={item}>{item}</Chip>
            ))}
          </Chips>
          <ResetButton type="button" onClick={search.reset}>
            Сбросить
          </ResetButton>
        </AppliedFilter>
      )}

      {notice && <Notice role="status">{notice}</Notice>}
    </>
  )
}
