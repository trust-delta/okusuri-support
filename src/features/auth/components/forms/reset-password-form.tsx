/**
 * パスワードリセットフォームコンポーネント
 */

'use client'

import { useState } from 'react'
import { resetPassword } from '../../api/auth-service'
import type { ResetPasswordFormData, AuthError } from '../../types'

interface ResetPasswordFormProps {
  onSuccess?: () => void
  onError?: (error: AuthError) => void
  className?: string
}

export function ResetPasswordForm({ onSuccess, onError, className }: ResetPasswordFormProps) {
  const [formData, setFormData] = useState<ResetPasswordFormData>({
    email: '',
  })

  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof ResetPasswordFormData, string>>>({})
  const [isSuccess, setIsSuccess] = useState(false)

  /**
   * フォーム送信処理
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // バリデーション
    const newErrors: Partial<Record<keyof ResetPasswordFormData, string>> = {}
    
    if (!formData.email.trim()) {
      newErrors.email = 'メールアドレスを入力してください'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '正しいメールアドレスを入力してください'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsLoading(true)
    setErrors({})

    try {
      const result = await resetPassword(formData)
      
      if (result.success) {
        setIsSuccess(true)
        onSuccess?.()
      } else if (result.error) {
        onError?.(result.error)
        setErrors({ email: result.error.message })
      }
    } catch {
      const authError: AuthError = {
        code: 'UNEXPECTED_ERROR',
        message: '予期しないエラーが発生しました',
      }
      onError?.(authError)
      setErrors({ email: authError.message })
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * 入力値更新
   */
  const updateFormData = (field: keyof ResetPasswordFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // エラーをクリア
    if (errors[field]) {
      const newErrors = { ...errors }
      delete newErrors[field]
      setErrors(newErrors)
    }
  }

  // 送信成功時の表示
  if (isSuccess) {
    return (
      <div className={className}>
        <div className="text-center">
          <div className="mb-4">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <svg 
                className="h-6 w-6 text-green-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            メールを送信しました
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            <span className="font-medium">{formData.email}</span> 宛てにパスワードリセットの手順を送信しました。
            メールを確認して、手順に従ってパスワードをリセットしてください。
          </p>
          <p className="text-xs text-gray-500">
            メールが届かない場合は、迷惑メールフォルダをご確認ください。
          </p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="space-y-4">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            パスワードを忘れた方
          </h2>
          <p className="text-sm text-gray-600">
            メールアドレスを入力してください。パスワードリセットの手順を送信します。
          </p>
        </div>

        {/* メールアドレス */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            メールアドレス
          </label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) => updateFormData('email', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
              errors.email ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="example@email.com"
            disabled={isLoading}
            autoComplete="email"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-500">{errors.email}</p>
          )}
        </div>

        {/* 送信ボタン */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? '送信中...' : 'リセットメールを送信'}
        </button>
      </div>
    </form>
  )
}