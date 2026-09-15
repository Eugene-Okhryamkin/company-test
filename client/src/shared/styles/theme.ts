export const theme = {
  colors: {
    background: '#f4f6fa',
    surface: '#ffffff',
    surfaceHover: '#f1f5f9',
    border: '#e2e8f0',
    text: '#0f172a',
    textMuted: '#64748b',
    accent: '#2563eb',
    focus: '#93c5fd',
    danger: '#b91c1c',
    dangerSurface: '#fef2f2',
    dangerBorder: '#fecaca',
    performance: {
      high: '#16a34a',
      medium: '#d97706',
      low: '#dc2626',
    },
  },
  radii: { sm: '6px', md: '10px' },
  fonts: {
    body: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  tree: { indentPx: 20, rowHeightPx: 36 },
} as const

export type AppTheme = typeof theme
