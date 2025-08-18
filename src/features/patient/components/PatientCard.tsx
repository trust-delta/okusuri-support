import React from 'react'
import { Patient } from '../types'
import PatientActions from './PatientActions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface PatientCardProps {
  patient: Patient
}

export default function PatientCard({ patient }: PatientCardProps) {
  return (
    <Card className="mb-4" data-testid="patient-card">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl" data-testid="patient-name">{patient.name}</CardTitle>
            <CardDescription data-testid="patient-age">{patient.age}歳</CardDescription>
          </div>
          <div className="text-sm text-muted-foreground">
            最終診察: {patient.lastCheckup.toLocaleDateString('ja-JP')}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="mb-4">
          <h3 className="text-lg font-medium mb-2">処方薬</h3>
          <div className="space-y-2">
            {patient.medications.map((med) => (
              <Card key={med.id} className="bg-muted/50" data-testid="medication-card">
                <CardContent className="p-3">
                  <div className="flex justify-between">
                    <span className="font-medium">{med.name}</span>
                    <span className="text-sm text-muted-foreground">
                      次回: {med.nextDue.toLocaleDateString('ja-JP')}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {med.dosage} | {med.frequency}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        
        <PatientActions patientId={patient.id} />
      </CardContent>
    </Card>
  )
}