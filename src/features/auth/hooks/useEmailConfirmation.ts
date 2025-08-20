/**
 * メール確認状態管理フック
 * メール確認フローの専用管理機能
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { verifyEmailConfirmation } from '../api/signup'

interface UseEmailConfirmationParams {
  email?: string
  onConfirmationComplete?: (userId: string) => void
  onConfirmationError?: (error: string) => void
}

interface UseEmailConfirmationReturn {
  // 状態
  isVerifying: boolean
  isConfirmed: boolean
  error: string | null

  // アクション
  verifyToken: (token: string, email: string) => Promise<boolean>
  reset: () => void

  // 自動確認機能
  startPolling: () => void
  stopPolling: () => void
}

/**
 * メール確認状態管理カスタムフック
 */
export function useEmailConfirmation(
  params: UseEmailConfirmationParams = {}
): UseEmailConfirmationReturn {
  const [isVerifying, setIsVerifying] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)

  /**
   * トークン検証実行
   */
  const verifyToken = useCallback(
    async (token: string): Promise<boolean> => {
      setIsVerifying(true)
      setError(null)

      try {
        const result = await verifyEmailConfirmation(token)

        if (result.success && result.userId) {
          setIsConfirmed(true)
          params.onConfirmationComplete?.(result.userId)
          return true
        }
        const errorMessage = result.error || 'メール確認に失敗しました'
        setError(errorMessage)
        params.onConfirmationError?.(errorMessage)
        return false
      } catch (error) {
        console.error('メール確認エラー:', error)
        const errorMessage = 'メール確認処理中にエラーが発生しました'
        setError(errorMessage)
        params.onConfirmationError?.(errorMessage)
        return false
      } finally {
        setIsVerifying(false)
      }
    },
    [params]
  )

  /**
   * 定期確認開始（メール確認完了を自動検知）
   * 注意: 実際のプロダクションでは使用を控える（APIレート制限のため）
   */
  const startPolling = useCallback(() => {
    if (pollingInterval || !params.email) return

    const interval = setInterval(async () => {
      // ここでは実装を控える（APIレート制限を避けるため）
      // 実際のアプリでは WebSocket やサーバーサイドイベントを使用
      console.log('メール確認ポーリング（実装は控え）')
    }, 10000) // 10秒間隔

    setPollingInterval(interval)
  }, [pollingInterval, params.email])

  /**
   * 定期確認停止
   */
  const stopPolling = useCallback(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval)
      setPollingInterval(null)
    }
  }, [pollingInterval])

  /**
   * 状態リセット
   */
  const reset = useCallback(() => {
    setIsVerifying(false)
    setIsConfirmed(false)
    setError(null)
    stopPolling()
  }, [stopPolling])

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [pollingInterval])

  return {
    // 状態
    isVerifying,
    isConfirmed,
    error,

    // アクション
    verifyToken,
    reset,

    // 自動確認機能
    startPolling,
    stopPolling,
  }
}

/**
 * URL パラメータからトークンを抽出
 */
export function extractTokenFromUrl(): { token: string | null; email: string | null } {
  if (typeof window === 'undefined') {
    return { token: null, email: null }
  }

  const urlParams = new URLSearchParams(window.location.search)
  const hashParams = new URLSearchParams(window.location.hash.substring(1))

  // トークンはクエリパラメータまたはハッシュパラメータに含まれる
  const token = urlParams.get('token') || hashParams.get('access_token') || null
  const email = urlParams.get('email') || null

  return { token, email }
}

/**
 * メール確認ページ用のヘルパー
 */
export function useEmailConfirmationPage() {
  const [urlParams, setUrlParams] = useState<{ token: string | null; email: string | null }>({
    token: null,
    email: null,
  })

  useEffect(() => {
    const params = extractTokenFromUrl()
    setUrlParams(params)
  }, [])

  const confirmationHook = useEmailConfirmation({
    ...(urlParams.email && { email: urlParams.email }),
    onConfirmationComplete: (userId) => {
      console.log('メール確認完了:', userId)
      // ここで認証状態の更新やリダイレクト処理を実行
    },
    onConfirmationError: (error) => {
      console.error('メール確認エラー:', error)
    },
  })

  // 自動確認実行
  useEffect(() => {
    if (urlParams.token && urlParams.email && !confirmationHook.isConfirmed) {
      confirmationHook.verifyToken(urlParams.token, urlParams.email)
    }
  }, [urlParams.token, urlParams.email, confirmationHook])

  return {
    ...confirmationHook,
    urlParams,
    hasTokenInUrl: Boolean(urlParams.token && urlParams.email),
  }
}
