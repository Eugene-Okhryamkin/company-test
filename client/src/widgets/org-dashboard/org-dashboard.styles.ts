import styled from 'styled-components'

export const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

export const Toolbar = styled.div`
  display: flex;
  justify-content: flex-end;
`

export const SplitLayout = styled.div`
  display: grid;
  grid-template-columns: minmax(300px, 1fr) minmax(0, 2fr);
  align-items: start;
  gap: 16px;
`

export const Switch = styled.div`
  display: inline-flex;
  padding: 3px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.surface};
`

export const SwitchButton = styled.button`
  padding: 6px 16px;
  border: none;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: transparent;
  color: ${({ theme }) => theme.colors.textMuted};
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;

  &[aria-pressed='true'] {
    background: ${({ theme }) => theme.colors.selected};
    color: ${({ theme }) => theme.colors.accent};
    font-weight: 600;
  }

  &:hover:not([aria-pressed='true']) {
    color: ${({ theme }) => theme.colors.text};
  }
`
