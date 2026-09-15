import { describe, expect, it } from 'vitest'
import { getDataVersion, setDataVersion } from '@/entities/org-node/live/data-version'
import { sampleOrgNodes } from '@/test/fixtures'

describe('data version registry', () => {
  it('attaches a version to a data array by identity', () => {
    const data = [...sampleOrgNodes]
    setDataVersion(data, 7)

    expect(getDataVersion(data)).toBe(7)
    expect(getDataVersion([...sampleOrgNodes])).toBeUndefined()
  })
})
