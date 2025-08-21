import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { beforeEach, afterEach, vi } from 'vitest'

// Mock environment variables for tests
process.env['NEXT_PUBLIC_SUPABASE_URL'] = 'https://test.supabase.co'
process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ0ZXN0LXN1cGFiYXNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE2Mjk4MTUwMDAsImV4cCI6MTk0NTM5MTAwMH0.test-anon-key-signature-for-vitest-only'
process.env['NEXT_PUBLIC_APP_URL'] = 'http://localhost:3000'
process.env['SUPABASE_SERVICE_ROLE_KEY'] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ0ZXN0LXN1cGFiYXNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTYyOTgxNTAwMCwiZXhwIjoxOTQ1MzkxMDAwfQ.test-service-key-signature-for-vitest-only'

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
