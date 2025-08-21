/**
 * ユーザーログインフォームコンポーネント
 */

'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { useState } from 'react'
import { signIn } from '../../api/auth-service'
import type { AuthError, AuthUser, SignInFormData } from '../../types'

interface SignInFormProps {
  onSuccess?: (user: AuthUser) => void
  onError?: (error: AuthError) => void
  className?: string
  showForgotPassword?: boolean
}

export function SignInForm({
  onSuccess,
  onError,
  className,
  showForgotPassword = true,
}: SignInFormProps) {
  const [formData, setFormData] = useState<SignInFormData>({
    email: '',
    password: '',
  })

  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof SignInFormData, string>>>({})
  const [generalError, setGeneralError] = useState<string | null>(null)

  /**
   * フォーム送信処理
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // バリデーション
    const newErrors: Partial<Record<keyof SignInFormData, string>> = {}

    if (!formData.email.trim()) {
      newErrors.email = 'メールアドレスを入力してください'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '正しいメールアドレスを入力してください'
    }

    if (!formData.password) {
      newErrors.password = 'パスワードを入力してください'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsLoading(true)
    setErrors({})
    setGeneralError(null)

    try {
      const result = await signIn(formData)

      if (result.success && result.data) {
        onSuccess?.(result.data)
      } else if (result.error) {
        onError?.(result.error)
        setGeneralError(result.error.message)
      }
    } catch {
      const authError: AuthError = {
        code: 'UNEXPECTED_ERROR',
        message: '予期しないエラーが発生しました',
      }
      onError?.(authError)
      setGeneralError(authError.message)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * 入力値更新
   */
  const updateFormData = (field: keyof SignInFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // エラーをクリア
    if (errors[field]) {
      const newErrors = { ...errors }
      delete newErrors[field]
      setErrors(newErrors)
    }
    if (generalError) {
      setGeneralError(null)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="space-y-4">
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
          {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
        </div>

        {/* パスワード */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            パスワード
          </label>
          <input
            type="password"
            id="password"
            value={formData.password}
            onChange={(e) => updateFormData('password', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
              errors.password ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="パスワードを入力"
            disabled={isLoading}
            autoComplete="current-password"
          />
          {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
        </div>

        {/* 全般エラー */}
        {generalError && (
          <div className="bg-red-50 border border-red-300 rounded-md p-3">
            <p className="text-sm text-red-700">{generalError}</p>
          </div>
        )}

        {/* パスワード忘れ */}
        {showForgotPassword && (
          <div className="text-right">
            <Link
              href={'/auth/forgot-password' as Route}
              className="text-sm text-blue-600 hover:underline"
            >
              パスワードを忘れた方
            </Link>
          </div>
        )}

        {/* ログインボタン */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'ログイン中...' : 'ログイン'}
        </button>
      </div>
    </form>
  )
}
