import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ThemeToggle from './theme-toggle'

// Mock next-themes
const mockSetTheme = vi.fn()

vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: mockSetTheme,
  }),
}))

// Mock icons
vi.mock('@/components/ui/icons', () => ({
  SunIcon: ({ size }: { size: number }) => <span data-testid="sun-icon">{size}</span>,
  MoonIcon: ({ size }: { size: number }) => <span data-testid="moon-icon">{size}</span>,
  ComputerIcon: ({ size }: { size: number }) => <span data-testid="computer-icon">{size}</span>,
}))

describe('ThemeToggle', () => {
  it('should render loading state before mounted', () => {
    render(<ThemeToggle />)
    expect(screen.getByTestId('sun-icon')).toBeInTheDocument()
  })

  it('should show correct icon for light theme after mounted', async () => {
    render(<ThemeToggle />)

    // Wait for component to mount
    await waitFor(() => {
      expect(screen.getByRole('button')).toHaveAttribute('title', '現在のテーマ: ライト')
    })

    expect(screen.getByTestId('sun-icon')).toBeInTheDocument()
  })

  it('should cycle theme when clicked', async () => {
    render(<ThemeToggle />)

    // Wait for component to mount
    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    const button = screen.getByRole('button')
    fireEvent.click(button)

    expect(mockSetTheme).toHaveBeenCalledWith('dark')
  })
})

describe('ThemeToggle interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should have accessible title attribute', async () => {
    render(<ThemeToggle />)

    await waitFor(() => {
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('title')
      expect(button.getAttribute('title')).toContain('現在のテーマ')
    })
  })

  it('should render as a clickable button', () => {
    render(<ThemeToggle />)

    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    expect(button).toBeEnabled()
  })
})
