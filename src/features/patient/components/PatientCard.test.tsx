import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import PatientCard from './PatientCard'
import { Patient } from '../types'

// PatientActions コンポーネントをモック
vi.mock('./PatientActions', () => ({
  default: ({ patientId }: { patientId: string }) => (
    <div data-testid="patient-actions">Actions for {patientId}</div>
  ),
}))

describe('PatientCard', () => {
  const mockPatient: Patient = {
    id: '1',
    name: '田中 太郎',
    age: 45,
    lastCheckup: new Date('2025-08-10'),
    medications: [
      {
        id: '1',
        name: 'ロキソニン',
        dosage: '60mg',
        frequency: '1日3回食後',
        nextDue: new Date('2025-08-18'),
      },
      {
        id: '2',
        name: 'ガスター10',
        dosage: '10mg',
        frequency: '1日2回朝夕食前',
        nextDue: new Date('2025-08-17'),
      },
    ],
  }

  it('患者の基本情報を表示する', () => {
    render(<PatientCard patient={mockPatient} />)
    
    expect(screen.getByText('田中 太郎')).toBeInTheDocument()
    expect(screen.getByText('45歳')).toBeInTheDocument()
    expect(screen.getByText('最終診察: 2025/8/10')).toBeInTheDocument()
  })

  it('処方薬の一覧を表示する', () => {
    render(<PatientCard patient={mockPatient} />)
    
    expect(screen.getByText('処方薬')).toBeInTheDocument()
    expect(screen.getByText('ロキソニン')).toBeInTheDocument()
    expect(screen.getByText('ガスター10')).toBeInTheDocument()
    expect(screen.getByText('60mg | 1日3回食後')).toBeInTheDocument()
    expect(screen.getByText('10mg | 1日2回朝夕食前')).toBeInTheDocument()
  })

  it('薬の次回服薬日を表示する', () => {
    render(<PatientCard patient={mockPatient} />)
    
    expect(screen.getByText('次回: 2025/8/18')).toBeInTheDocument()
    expect(screen.getByText('次回: 2025/8/17')).toBeInTheDocument()
  })

  it('PatientActionsコンポーネントに正しいpatientIdを渡す', () => {
    render(<PatientCard patient={mockPatient} />)
    
    expect(screen.getByTestId('patient-actions')).toBeInTheDocument()
    expect(screen.getByText('Actions for 1')).toBeInTheDocument()
  })

  it('薬がない患者の場合でも正常に表示する', () => {
    const patientWithoutMedications: Patient = {
      ...mockPatient,
      medications: [],
    }

    render(<PatientCard patient={patientWithoutMedications} />)
    
    expect(screen.getByText('田中 太郎')).toBeInTheDocument()
    expect(screen.getByText('処方薬')).toBeInTheDocument()
    expect(screen.getByTestId('patient-actions')).toBeInTheDocument()
  })
})
