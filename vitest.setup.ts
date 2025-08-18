import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { beforeEach, afterEach, vi } from 'vitest'

// Mock window.matchMedia for next-themes
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
})

// Mock IntersectionObserver for components that use it
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })),
})

// Mock ResizeObserver for components that use it
Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })),
})

// Setup and teardown for React Testing Library
beforeEach(() => {
  // Reset any mocks before each test
  vi.clearAllMocks()
})

afterEach(() => {
  // Clean up DOM after each test to prevent test interference
  cleanup()
})
