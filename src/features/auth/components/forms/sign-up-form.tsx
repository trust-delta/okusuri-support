/**
 * ユーザー登録フォームコンポーネント
 */

'use client'

import { useState } from 'react'
import { signUp } from '../../api/auth-service'
import type { SignUpFormData, AuthError } from '../../types'
import type { UserRole } from '@/lib/supabase/types'

interface SignUpFormProps {
  onSuccess?: (data: { needsConfirmation: boolean }) => void
  onError?: (error: AuthError) => void
  className?: string
}

export function SignUpForm({ onSuccess, onError, className }: SignUpFormProps) {
  const [formData, setFormData] = useState<SignUpFormData>({
    email: '',
    password: '',
    role: 'patient', // デフォルトは患者
    displayName: '',
    phoneNumber: '',
  })

  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof SignUpFormData, string>>>({})

  /**
   * フォーム送信処理
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // バリデーション
    const newErrors: Partial<Record<keyof SignUpFormData, string>> = {}
    
    if (!formData.email.trim()) {
      newErrors.email = 'メールアドレスを入力してください'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '正しいメールアドレスを入力してください'
    }
    
    if (!formData.password) {
      newErrors.password = 'パスワードを入力してください'
    } else if (formData.password.length < 6) {
      newErrors.password = 'パスワードは6文字以上で入力してください'
    }
    
    if (!formData.displayName?.trim()) {
      newErrors.displayName = '表示名を入力してください'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsLoading(true)
    setErrors({})

    try {
      const result = await signUp(formData)
      
      if (result.success && result.data) {
        onSuccess?.(result.data)
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
  const updateFormData = (field: keyof SignUpFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // エラーをクリア
    if (errors[field]) {
      const newErrors = { ...errors }
      delete newErrors[field]
      setErrors(newErrors)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="space-y-4">
        {/* ロール選択 */}
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
            登録区分
          </label>
          <select
            id="role"
            value={formData.role}
            onChange={(e) => updateFormData('role', e.target.value as UserRole)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          >
            <option value="patient">患者</option>
            <option value="supporter">支援者</option>
          </select>
        </div>

        {/* 表示名 */}
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
            表示名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="displayName"
            value={formData.displayName || ''}
            onChange={(e) => updateFormData('displayName', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
              errors.displayName ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="山田太郎"
            disabled={isLoading}
          />
          {errors.displayName && (
            <p className="mt-1 text-sm text-red-500">{errors.displayName}</p>
          )}
        </div>

        {/* メールアドレス */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            メールアドレス <span className="text-red-500">*</span>
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
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-500">{errors.email}</p>
          )}
        </div>

        {/* パスワード */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            パスワード <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            id="password"
            value={formData.password}
            onChange={(e) => updateFormData('password', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
              errors.password ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="6文字以上"
            disabled={isLoading}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-500">{errors.password}</p>
          )}
        </div>

        {/* 電話番号（任意） */}
        <div>
          <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
            電話番号（任意）
          </label>
          <input
            type="tel"
            id="phoneNumber"
            value={formData.phoneNumber || ''}
            onChange={(e) => updateFormData('phoneNumber', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="090-1234-5678"
            disabled={isLoading}
          />
        </div>

        {/* 送信ボタン */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? '登録中...' : 'アカウントを作成'}
        </button>
      </div>

      {/* 利用規約への同意（実装時に追加） */}
      <div className="mt-4 text-center text-sm text-gray-600">
        アカウントを作成することで、
        <a href="/terms" className="text-blue-600 hover:underline" rel="noopener noreferrer" target="_blank">
          利用規約
        </a>
        と
        <a href="/privacy" className="text-blue-600 hover:underline" rel="noopener noreferrer" target="_blank">
          プライバシーポリシー
        </a>
        に同意したものとみなします。
      </div>
    </form>
  )
}