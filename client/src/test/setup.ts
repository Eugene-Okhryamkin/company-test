import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'
import { mockMatchMedia } from '@/test/match-media'

beforeEach(() => {
  // jsdom has no matchMedia: narrow viewport, reduced motion on (animations settle instantly).
  mockMatchMedia({ width: 1024, reducedMotion: true })
})

afterEach(() => {
  cleanup()
})
