/**
 * 招待作成フォームコンポーネント
 */

'use client'

import { useAuth } from '@/features/auth'
import type { UserRole } from '@/lib/supabase/types'
import { useState } from 'react'
import type { CreateInvitationFormData, PairError } from '../../types'

interface CreateInvitationFormProps {
  onSuccess?: (data: { invitationId: string }) => void
  onError?: (error: PairError) => void
  className?: string
}

export function CreateInvitationForm({ onSuccess, onError, className }: CreateInvitationFormProps) {
  const { user } = useAuth()

  const [formData, setFormData] = useState<CreateInvitationFormData>({
    inviteeEmail: '',
    targetRole: user?.role === 'patient' ? 'supporter' : 'patient',
    message: '',
  })

  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof CreateInvitationFormData, string>>>({})

  /**
   * フォーム送信処理
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // バリデーション
    const newErrors: Partial<Record<keyof CreateInvitationFormData, string>> = {}

    if (!formData.inviteeEmail.trim()) {
      newErrors.inviteeEmail = 'メールアドレスを入力してください'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.inviteeEmail)) {
      newErrors.inviteeEmail = '正しいメールアドレスを入力してください'
    } else if (user && formData.inviteeEmail === user.email) {
      newErrors.inviteeEmail = '自分自身を招待することはできません'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsLoading(true)
    setErrors({})

    try {
      const { createInvitation } = await import('../../api/pair-service')
      const result = await createInvitation(formData)

      if (result.success && result.data) {
        // フォームをリセット
        setFormData({
          inviteeEmail: '',
          targetRole: user?.role === 'patient' ? 'supporter' : 'patient',
          message: '',
        })
        onSuccess?.(result.data)
      } else if (result.error) {
        onError?.(result.error)
        setErrors({ inviteeEmail: result.error.message })
      }
    } catch {
      const pairError: PairError = {
        code: 'UNEXPECTED_ERROR',
        message: '予期しないエラーが発生しました',
      }
      onError?.(pairError)
      setErrors({ inviteeEmail: pairError.message })
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * 入力値更新
   */
  const updateFormData = (field: keyof CreateInvitationFormData, value: string | UserRole) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // エラーをクリア
    if (errors[field]) {
      const newErrors = { ...errors }
      delete newErrors[field]
      setErrors(newErrors)
    }
  }

  if (!user) {
    return (
      <div className={className}>
        <div className="text-center text-gray-600">招待を送るにはログインが必要です。</div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="space-y-4">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {user.role === 'patient' ? '支援者を招待' : '患者を招待'}
          </h2>
          <p className="text-sm text-gray-600">
            {user.role === 'patient'
              ? 'あなたをサポートしてくれる方のメールアドレスを入力してください。'
              : 'あなたがサポートする患者さんのメールアドレスを入力してください。'}
          </p>
        </div>

        {/* 招待先メールアドレス */}
        <div>
          <label htmlFor="inviteeEmail" className="block text-sm font-medium text-gray-700 mb-1">
            招待するメールアドレス <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="inviteeEmail"
            value={formData.inviteeEmail}
            onChange={(e) => updateFormData('inviteeEmail', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
              errors.inviteeEmail ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="example@email.com"
            disabled={isLoading}
          />
          {errors.inviteeEmail && (
            <p className="mt-1 text-sm text-red-500">{errors.inviteeEmail}</p>
          )}
        </div>

        {/* 招待対象ロール（読み取り専用） */}
        <div>
          <label htmlFor="targetRole" className="block text-sm font-medium text-gray-700 mb-1">
            招待先の役割
          </label>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <input
                type="radio"
                id="role-patient"
                name="targetRole"
                value="patient"
                checked={formData.targetRole === 'patient'}
                onChange={(e) => updateFormData('targetRole', e.target.value as UserRole)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                disabled={isLoading || user.role === 'patient'}
              />
              <label htmlFor="role-patient" className="ml-2 text-sm text-gray-700">
                患者
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="radio"
                id="role-supporter"
                name="targetRole"
                value="supporter"
                checked={formData.targetRole === 'supporter'}
                onChange={(e) => updateFormData('targetRole', e.target.value as UserRole)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                disabled={isLoading || user.role === 'supporter'}
              />
              <label htmlFor="role-supporter" className="ml-2 text-sm text-gray-700">
                支援者
              </label>
            </div>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            あなたは「{user.role === 'patient' ? '患者' : '支援者'}
            」として登録されているため、相手は「{user.role === 'patient' ? '支援者' : '患者'}
            」である必要があります。
          </p>
        </div>

        {/* メッセージ（任意） */}
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
            メッセージ（任意）
          </label>
          <textarea
            id="message"
            value={formData.message || ''}
            onChange={(e) => updateFormData('message', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="招待に添えるメッセージがあればご記入ください..."
            disabled={isLoading}
          />
        </div>

        {/* 送信ボタン */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? '送信中...' : '招待を送信'}
        </button>
      </div>

      {/* 注意事項 */}
      <div className="mt-4 text-xs text-gray-500">
        <p>・ 招待の有効期限は7日間です。</p>
        <p>・ 招待された方はメールで通知を受け取ります。</p>
        <p>・ 1人の患者に対して1人の支援者のみペアを組めます。</p>
      </div>
    </form>
  )
}
