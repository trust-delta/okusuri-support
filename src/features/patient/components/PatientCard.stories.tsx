import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import PatientCard from './PatientCard'
import { Patient } from '../types'

// Mock patient data
const createMockPatient = (overrides?: Partial<Patient>): Patient => ({
  id: 'patient-001',
  name: '田中 太郎',
  age: 65,
  lastCheckup: new Date('2025-08-15'),
  medications: [
    {
      id: 'med-001',
      name: 'アムロジピン錠',
      dosage: '5mg',
      frequency: '1日1回 朝食後',
      nextDue: new Date('2025-08-18'),
    },
    {
      id: 'med-002',
      name: 'メトホルミン錠',
      dosage: '250mg',
      frequency: '1日2回 朝・夕食後',
      nextDue: new Date('2025-08-18'),
    },
  ],
  ...overrides,
})

const meta = {
  title: 'Features/Patient/PatientCard',
  component: PatientCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    patient: {
      description: 'Patient data to display in the card',
    },
  },
} satisfies Meta<typeof PatientCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    patient: createMockPatient(),
  },
}

export const YoungPatient: Story = {
  args: {
    patient: createMockPatient({
      id: 'patient-002',
      name: '佐藤 花子',
      age: 28,
      lastCheckup: new Date('2025-08-10'),
    }),
  },
}

export const ElderlyPatient: Story = {
  args: {
    patient: createMockPatient({
      id: 'patient-003',
      name: '山田 一郎',
      age: 85,
      lastCheckup: new Date('2025-08-12'),
    }),
  },
}

export const SingleMedication: Story = {
  args: {
    patient: createMockPatient({
      id: 'patient-004',
      name: '高橋 美咲',
      age: 42,
      medications: [
        {
          id: 'med-single',
          name: 'ロキソニン錠',
          dosage: '60mg',
          frequency: '1日3回 毎食後',
          nextDue: new Date('2025-08-19'),
        },
      ],
    }),
  },
}

export const MultipleMedications: Story = {
  args: {
    patient: createMockPatient({
      id: 'patient-005',
      name: '鈴木 健太',
      age: 58,
      medications: [
        {
          id: 'med-multi-1',
          name: 'アムロジピン錠',
          dosage: '5mg',
          frequency: '1日1回 朝食後',
          nextDue: new Date('2025-08-18'),
        },
        {
          id: 'med-multi-2',
          name: 'メトホルミン錠',
          dosage: '250mg',
          frequency: '1日2回 朝・夕食後',
          nextDue: new Date('2025-08-18'),
        },
        {
          id: 'med-multi-3',
          name: 'アトルバスタチン錠',
          dosage: '10mg',
          frequency: '1日1回 夕食後',
          nextDue: new Date('2025-08-19'),
        },
        {
          id: 'med-multi-4',
          name: 'オメプラゾール錠',
          dosage: '20mg',
          frequency: '1日1回 朝食前',
          nextDue: new Date('2025-08-17'),
        },
      ],
    }),
  },
}

export const RecentCheckup: Story = {
  args: {
    patient: createMockPatient({
      id: 'patient-006',
      name: '渡辺 さくら',
      age: 34,
      lastCheckup: new Date(), // Today
    }),
  },
}

export const OverdueCheckup: Story = {
  args: {
    patient: createMockPatient({
      id: 'patient-007',
      name: '中村 正夫',
      age: 72,
      lastCheckup: new Date('2025-07-01'), // Over a month ago
    }),
  },
}

// Interactive story showing multiple patient cards
export const MultiplePatients: Story = {
  args: {
    patient: createMockPatient(),
  },
  render: () => (
    <div className="space-y-4 max-w-4xl">
      <PatientCard 
        patient={createMockPatient({
          id: 'patient-multi-1',
          name: '田中 太郎',
          age: 65,
        })} 
      />
      <PatientCard 
        patient={createMockPatient({
          id: 'patient-multi-2',
          name: '佐藤 花子',
          age: 28,
          medications: [
            {
              id: 'med-single-multi',
              name: 'ビタミンD錠',
              dosage: '1000IU',
              frequency: '1日1回',
              nextDue: new Date('2025-08-20'),
            },
          ],
        })} 
      />
      <PatientCard 
        patient={createMockPatient({
          id: 'patient-multi-3',
          name: '山田 一郎',
          age: 85,
          medications: [
            {
              id: 'med-elder-1',
              name: 'アスピリン錠',
              dosage: '100mg',
              frequency: '1日1回 朝食後',
              nextDue: new Date('2025-08-18'),
            },
            {
              id: 'med-elder-2',
              name: 'ワルファリン錠',
              dosage: '2mg',
              frequency: '1日1回 夕食後',
              nextDue: new Date('2025-08-18'),
            },
            {
              id: 'med-elder-3',
              name: 'フロセミド錠',
              dosage: '20mg',
              frequency: '1日1回 朝食後',
              nextDue: new Date('2025-08-19'),
            },
          ],
        })} 
      />
    </div>
  ),
}