import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock fetch globally
global.fetch = vi.fn()

// Mock console.error
vi.spyOn(console, 'error').mockImplementation(() => {})

// Mock process.env for tests
vi.stubEnv('GEMINI_API_KEY', 'test-key')

// Cleanup
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

