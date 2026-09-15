import styled from 'styled-components'

export const SearchForm = styled.form`
  display: flex;
  flex: 1 1 320px;
  gap: 8px;
  max-width: 560px;
`

export const SearchInput = styled.input`
  flex: 1 1 auto;
  min-width: 0;
  padding: 6px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  font: inherit;
  color: inherit;
  background: ${({ theme }) => theme.colors.surface};

  &::placeholder {
    color: ${({ theme }) => theme.colors.textMuted};
  }
`

export const AiButton = styled.button`
  flex: 0 0 auto;
  padding: 6px 12px;
  border: 1px solid ${({ theme }) => theme.colors.accent};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.selected};
  color: ${({ theme }) => theme.colors.accent};
  font: inherit;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    cursor: default;
    opacity: 0.6;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.focus};
    outline-offset: 2px;
  }
`

export const AppliedFilter = styled.section`
  display: flex;
  flex: 1 0 100%;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
`

export const Chips = styled.ul`
  display: contents;
  list-style: none;
`

export const Chip = styled.li`
  padding: 2px 8px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.selected};
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.875em;
`

export const ResetButton = styled.button`
  padding: 2px 8px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.accent};
  font: inherit;
  font-size: 0.875em;
  cursor: pointer;
  text-decoration: underline;
`

export const Notice = styled.p`
  flex: 1 0 100%;
  margin: 0;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.875em;
`
