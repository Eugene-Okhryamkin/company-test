import styled from 'styled-components'

export const Panel = styled.section`
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.surface};
`

export const PanelHeading = styled.h2`
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
`

/** Scrollable body of a panel, so long content scrolls inside the panel, not the page. */
export const PanelBody = styled.div`
  min-height: 0;
  max-height: calc(100vh - 220px);
  overflow: auto;
`
