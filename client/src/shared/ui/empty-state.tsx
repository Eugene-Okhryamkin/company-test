import styled from 'styled-components'

const Box = styled.div`
  padding: 48px 16px;
  text-align: center;
  color: ${({ theme }) => theme.colors.textMuted};
`

const Title = styled.p`
  margin: 0 0 4px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`

const Description = styled.p`
  margin: 0;
`

interface EmptyStateProps {
  title: string
  description?: string
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <Box>
      <Title>{title}</Title>
      {description && <Description>{description}</Description>}
    </Box>
  )
}
