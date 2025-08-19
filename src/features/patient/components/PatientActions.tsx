'use client'

import React, { useState } from 'react'
import { CheckIcon, ClockIcon } from '@/components/ui/icons'
import { Button } from '@/components/ui/button/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog/dialog'

interface PatientActionsProps {
  patientId: string
}

export default function PatientActions({ patientId }: PatientActionsProps) {
  const [isRecording, setIsRecording] = useState(false)

  const handleMedicationRecord = () => {
    setIsRecording(true)
    setTimeout(() => {
      setIsRecording(false)
      alert('服薬記録が保存されました')
    }, 1000)
  }

  return (
    <div className="flex gap-2">
      <Button
        onClick={handleMedicationRecord}
        disabled={isRecording}
        className="flex items-center gap-2"
        data-testid="take-medication"
      >
        {isRecording ? (
          <>
            <ClockIcon size={16} />
            記録中...
          </>
        ) : (
          <>
            <CheckIcon size={16} />
            服薬記録
          </>
        )}
      </Button>

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" data-testid="add-medication">詳細表示</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>患者詳細情報</DialogTitle>
            <DialogDescription>
              患者の詳細な医療情報と服薬履歴を確認できます。
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p>患者ID: {patientId}</p>
            <p>※ 詳細情報の実装は今後のタスクで行います。</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}