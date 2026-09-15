import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'
import { mockMatchMedia } from '@/test/match-media'

beforeEach(() => {
  // jsdom has no matchMedia; default to a narrow viewport. Tests can switch it via mockMatchMedia().
  mockMatchMedia({ width: 1024 })
})

afterEach(() => {
  cleanup()
})
