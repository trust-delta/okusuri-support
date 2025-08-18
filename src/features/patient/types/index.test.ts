import { describe, expect, it } from 'vitest'
import type { Medication, Patient } from './index'

describe('Patient Types', () => {
  describe('Medication type', () => {
    it('正しいMedication型を受け入れる', () => {
      const validMedication: Medication = {
        id: '1',
        name: 'ロキソニン',
        dosage: '60mg',
        frequency: '1日3回食後',
        nextDue: new Date('2025-08-18'),
      }

      // 型チェックが成功することを確認
      expect(validMedication.id).toBe('1')
      expect(validMedication.name).toBe('ロキソニン')
      expect(validMedication.dosage).toBe('60mg')
      expect(validMedication.frequency).toBe('1日3回食後')
      expect(validMedication.nextDue).toBeInstanceOf(Date)
    })
  })

  describe('Patient type', () => {
    it('正しいPatient型を受け入れる', () => {
      const validPatient: Patient = {
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
        ],
      }

      expect(validPatient.id).toBe('1')
      expect(validPatient.name).toBe('田中 太郎')
      expect(validPatient.age).toBe(45)
      expect(validPatient.lastCheckup).toBeInstanceOf(Date)
      expect(validPatient.medications).toHaveLength(1)
      expect(validPatient.medications[0]).toMatchObject({
        id: '1',
        name: 'ロキソニン',
        dosage: '60mg',
        frequency: '1日3回食後',
      })
    })

    it('薬が空配列のPatientも受け入れる', () => {
      const patientWithoutMedications: Patient = {
        id: '2',
        name: '佐藤 花子',
        age: 30,
        lastCheckup: new Date('2025-08-15'),
        medications: [],
      }

      expect(patientWithoutMedications.medications).toHaveLength(0)
      expect(Array.isArray(patientWithoutMedications.medications)).toBe(true)
    })
  })
})
