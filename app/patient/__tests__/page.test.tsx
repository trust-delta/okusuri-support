import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import PatientPage from '../page'

// Mock the components
vi.mock('@/features/patient/components', () => ({
  PatientCard: ({ patient }: { patient: unknown }) => (
    <div data-testid="patient-card">
      {typeof patient === 'object' && patient && 'name' in patient
        ? (patient as { name: string }).name
        : 'Unknown Patient'}
    </div>
  ),
}))

vi.mock('@/components/theme-toggle', () => ({
  default: () => (
    <button type="button" data-testid="theme-toggle">
      Theme Toggle
    </button>
  ),
}))

describe('PatientPage', () => {
  it('should render the page title', () => {
    render(<PatientPage />)
    expect(screen.getByText('患者情報')).toBeInTheDocument()
  })

  it('should render theme toggle component', () => {
    render(<PatientPage />)
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()
  })

  it('should render patient card with sample data', () => {
    render(<PatientPage />)
    const patientCard = screen.getByTestId('patient-card')
    expect(patientCard).toBeInTheDocument()
    expect(patientCard).toHaveTextContent('田中 太郎')
  })

  it('should have correct layout structure', () => {
    render(<PatientPage />)

    // Check main wrapper
    const main = screen.getByRole('main')
    expect(main).toHaveClass('min-h-screen', 'bg-background', 'p-8')

    // Check header with title and theme toggle
    const title = screen.getByText('患者情報')
    const themeToggle = screen.getByTestId('theme-toggle')

    expect(title).toBeInTheDocument()
    expect(themeToggle).toBeInTheDocument()
  })
})
