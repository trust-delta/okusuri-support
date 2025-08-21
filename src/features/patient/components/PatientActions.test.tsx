import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PatientActions from './PatientActions'

// alert をモック
global.alert = vi.fn()

describe('PatientActions', () => {
  const mockPatientId = 'test-patient-id'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('初期状態でボタンが正しく表示される', () => {
    render(<PatientActions patientId={mockPatientId} />)

    expect(screen.getByText('服薬記録')).toBeInTheDocument()
    expect(screen.getByText('詳細表示')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '服薬記録' })).not.toBeDisabled()
  })

  it('服薬記録ボタンをクリックすると記録処理が実行される', async () => {
    render(<PatientActions patientId={mockPatientId} />)

    const recordButton = screen.getByRole('button', { name: '服薬記録' })
    fireEvent.click(recordButton)

    // 記録中状態の確認
    expect(screen.getByText('記録中...')).toBeInTheDocument()
    expect(recordButton).toBeDisabled()

    // 非同期処理の完了を待つ
    await waitFor(() => {
      expect(screen.getByText('服薬記録')).toBeInTheDocument()
    })

    // ボタンが再び有効になることを確認
    expect(recordButton).not.toBeDisabled()

    // alert が呼び出されることを確認
    expect(global.alert).toHaveBeenCalledWith('服薬記録が保存されました')
  })

  it('記録中はボタンを二重クリックできない', () => {
    render(<PatientActions patientId={mockPatientId} />)

    const recordButton = screen.getByRole('button', { name: '服薬記録' })
    fireEvent.click(recordButton)

    // 記録中状態であることを確認
    expect(screen.getByText('記録中...')).toBeInTheDocument()
    expect(recordButton).toBeDisabled()

    // 記録中状態で再びクリック（無効化されているので反応しない）
    fireEvent.click(recordButton)

    // 依然として記録中状態であることを確認
    expect(screen.getByText('記録中...')).toBeInTheDocument()
  })
})
