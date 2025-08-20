/**
 * サインアップ状態管理フック
 * メール認証サインアップフローの状態管理
 */

'use client'

import { useCallback, useState } from 'react'
import { resendConfirmationEmail, signUpWithEmailConfirmation } from '../api/signup'
import type { SignUpFormInput, SignUpResult, UseSignUpReturn } from '../schemas/signup'
import { isWeakPassword, transformToSignUpRequest } from '../schemas/signup'

/**
 * サインアップ状態管理カスタムフック
 */
export function useSignUp(): UseSignUpReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SignUpResult | null>(null)

  /**
   * サインアップ実行
   */
  const signUp = useCallback(async (formData: SignUpFormInput): Promise<SignUpResult> => {
    setIsLoading(true)
    setError(null)
    setIsSuccess(false)

    try {
      // 弱いパスワードの警告（停止はしない）
      if (isWeakPassword(formData.password)) {
        console.warn('弱いパスワードが使用されています:', formData.email)
      }

      const apiRequest = transformToSignUpRequest(formData)
      const response = await signUpWithEmailConfirmation(apiRequest)

      setResult(response)

      if (response.success) {
        setIsSuccess(true)
        setError(null)
      } else {
        setError(response.error?.message || 'サインアップに失敗しました')
        setIsSuccess(false)
      }

      return response
    } catch (error) {
      console.error('サインアップ処理エラー:', error)

      const errorMessage = 'サインアップ処理中にエラーが発生しました'
      const errorResult: SignUpResult = {
        success: false,
        error: {
          code: 'SIGNUP_PROCESS_ERROR',
          message: errorMessage,
          details: error instanceof Error ? error.message : String(error),
        },
      }

      setResult(errorResult)
      setError(errorMessage)
      setIsSuccess(false)

      return errorResult
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * 確認メール再送信
   */
  const resendConfirmation = useCallback(async (email: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await resendConfirmationEmail(email)

      if (!response.success) {
        setError(response.error || '確認メールの再送信に失敗しました')
        return false
      }

      return true
    } catch (error) {
      console.error('確認メール再送信エラー:', error)
      setError('確認メール再送信処理中にエラーが発生しました')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * 状態リセット
   */
  const reset = useCallback(() => {
    setIsLoading(false)
    setIsSuccess(false)
    setError(null)
    setResult(null)
  }, [])

  return {
    // 状態
    isLoading,
    isSuccess,
    error,
    result,

    // アクション
    signUp,
    reset,
    resendConfirmation,
  }
}

/**
 * サインアップ成功判定ヘルパー
 */
export function isSignUpSuccess(result: SignUpResult | null): result is SignUpResult & {
  success: true
  data: NonNullable<SignUpResult['data']>
} {
  return result?.success === true && result.data != null
}

/**
 * メール確認が必要かどうかの判定
 */
export function needsEmailConfirmation(result: SignUpResult | null): boolean {
  return isSignUpSuccess(result) && result.data.needsEmailConfirmation
}

/**
 * サインアップエラーのフィールド特定ヘルパー
 */
export function getErrorField(result: SignUpResult | null): string | null {
  if (!result || result.success || !result.error?.field) {
    return null
  }
  return result.error.field
}
