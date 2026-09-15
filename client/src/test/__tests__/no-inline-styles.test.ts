import { describe, expect, it } from 'vitest'

const sources = import.meta.glob(['/src/**/*.tsx', '!/src/**/*.test.tsx', '!/src/test/**'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

describe('project rule: no inline CSS', () => {
  it('scans component sources', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(0)
  })

  it.each(Object.entries(sources))('%s has no style={…} props', (_path, source) => {
    expect(source).not.toMatch(/\bstyle=\{/)
  })
})
