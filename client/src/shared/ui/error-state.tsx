import styled, { css } from 'styled-components'
import { Button } from '@/shared/ui/button'

type Variant = 'block' | 'inline'

const Box = styled.div<{ $variant: Variant }>`
  display: flex;
  gap: 12px;
  border: 1px solid ${({ theme }) => theme.colors.dangerBorder};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.dangerSurface};
  color: ${({ theme }) => theme.colors.danger};

  ${({ $variant }) =>
    $variant === 'block'
      ? css`
          flex-direction: column;
          align-items: center;
          margin: 24px 0;
          padding: 32px 16px;
          text-align: center;
        `
      : css`
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          padding: 8px 12px;
        `}
`

const Title = styled.p`
  margin: 0;
  font-weight: 600;
`

const Description = styled.p`
  margin: 0;
`

interface ErrorStateProps {
  title: string
  description?: string
  onRetry?: () => void
  variant?: Variant
}

export function ErrorState({ title, description, onRetry, variant = 'block' }: ErrorStateProps) {
  return (
    <Box role="alert" $variant={variant}>
      <div>
        <Title>{title}</Title>
        {description && <Description>{description}</Description>}
      </div>
      {onRetry && (
        <Button type="button" onClick={onRetry}>
          Повторить
        </Button>
      )}
    </Box>
  )
}
