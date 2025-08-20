/**
 * サインイン状態管理フック
 * メール認証サインインフローの状態管理
 */

'use client'

import { useCallback, useState } from 'react'
import { signInWithEmailPassword, signOut } from '../api/signin'
import type { SignInFormInput, SignInResult, UseSignInReturn } from '../schemas/signin'
import { transformToSignInRequest } from '../schemas/signin'

/**
 * サインイン状態管理カスタムフック
 */
export function useSignIn(): UseSignInReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SignInResult | null>(null)

  /**
   * サインイン実行
   */
  const signIn = useCallback(async (formData: SignInFormInput): Promise<SignInResult> => {
    setIsLoading(true)
    setError(null)
    setIsSuccess(false)

    try {
      const apiRequest = transformToSignInRequest(formData)
      const response = await signInWithEmailPassword(apiRequest)

      setResult(response)

      if (response.success) {
        setIsSuccess(true)
        setError(null)
      } else {
        setError(response.error?.message || 'ログインに失敗しました')
        setIsSuccess(false)
      }

      return response
    } catch (error) {
      console.error('サインイン処理エラー:', error)

      const errorMessage = 'ログイン処理中にエラーが発生しました'
      const errorResult: SignInResult = {
        success: false,
        error: {
          code: 'SIGNIN_PROCESS_ERROR',
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
   * ログアウト実行
   */
  const signOutUser = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      await signOut()

      // 成功時は状態をリセット
      setIsSuccess(false)
      setResult(null)
    } catch (error) {
      console.error('ログアウト処理エラー:', error)
      setError('ログアウト処理中にエラーが発生しました')
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
    signIn,
    signOut: signOutUser,
    reset,
  }
}

/**
 * サインイン成功判定ヘルパー
 */
export function isSignInSuccess(result: SignInResult | null): result is SignInResult & {
  success: true
  data: NonNullable<SignInResult['data']>
} {
  return result?.success === true && result.data != null
}

/**
 * メール確認が必要かどうかの判定
 */
export function needsEmailConfirmation(result: SignInResult | null): boolean {
  return isSignInSuccess(result) && result.data.needsEmailConfirmation
}

/**
 * リダイレクト先URLの取得
 */
export function getRedirectUrl(result: SignInResult | null): string | null {
  if (!isSignInSuccess(result)) return null
  return result.data.redirectTo || null
}

/**
 * サインインエラーのフィールド特定ヘルパー
 */
export function getSignInErrorField(result: SignInResult | null): string | null {
  if (!result || result.success || !result.error?.field) {
    return null
  }
  return result.error.field
}
