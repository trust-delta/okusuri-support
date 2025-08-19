import ThemeToggle from '@/components/ui/theme-toggle/theme-toggle'
import { PatientCard } from '@/features/patient/components'
import type { Patient } from '@/features/patient/types'
import React from 'react'

export default function PatientPage() {
  // サンプルデータ
  const samplePatient: Patient = {
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

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-foreground">患者情報</h1>
          <ThemeToggle />
        </div>
        <PatientCard patient={samplePatient} />
      </div>
    </main>
  )
}
