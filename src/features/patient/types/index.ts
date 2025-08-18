export interface Patient {
  id: string
  name: string
  age: number
  medications: Medication[]
  lastCheckup: Date
}

export interface Medication {
  id: string
  name: string
  dosage: string
  frequency: string
  nextDue: Date
}
