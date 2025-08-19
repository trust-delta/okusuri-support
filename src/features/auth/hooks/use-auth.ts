/**
 * 認証状態管理フック
 * Supabase認証セッションの監視とユーザー情報管理
 */

'use client'

import { getSupabaseClient } from '@/lib/supabase'
import { useCallback, useEffect, useState } from 'react'
import { getCurrentUser } from '../api/auth-service'
import type { AuthState, AuthUser } from '../types'

/**
 * 認証状態管理カスタムフック
 */
export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({ status: 'loading' })

  /**
   * 認証状態の更新
   */
  const updateAuthState = useCallback(async (userId: string | null) => {
    if (!userId) {
      setAuthState({ status: 'unauthenticated' })
      return
    }

    try {
      const user = await getCurrentUser()
      if (user) {
        setAuthState({
          status: 'authenticated',
          user,
        })
      } else {
        setAuthState({ status: 'unauthenticated' })
      }
    } catch (error) {
      console.error('認証状態更新エラー:', error)
      setAuthState({
        status: 'error',
        error: {
          code: 'AUTH_STATE_UPDATE_FAILED',
          message: '認証状態の更新に失敗しました',
        },
      })
    }
  }, [])

  /**
   * 初期化とセッション監視
   */
  useEffect(() => {
    const supabase = getSupabaseClient()

    // 現在のセッション状態を確認
    const initializeAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        await updateAuthState(session?.user?.id || null)
      } catch (error) {
        console.error('認証初期化エラー:', error)
        setAuthState({ status: 'unauthenticated' })
      }
    }

    initializeAuth()

    // 認証状態変更の監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('認証状態変更:', event, session?.user?.id)
      await updateAuthState(session?.user?.id || null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [updateAuthState])

  /**
   * 便利な状態チェック関数
   */
  const isLoading = authState.status === 'loading'
  const isAuthenticated = authState.status === 'authenticated'
  const isUnauthenticated = authState.status === 'unauthenticated'
  const hasError = authState.status === 'error'

  const user = authState.status === 'authenticated' ? authState.user : null
  const error = authState.status === 'error' ? authState.error : null

  /**
   * ロールベースのアクセス制御
   */
  const isPatient = user?.role === 'patient'
  const isSupporter = user?.role === 'supporter'

  return {
    // 状態
    authState,
    isLoading,
    isAuthenticated,
    isUnauthenticated,
    hasError,
    user,
    error,

    // ロールチェック
    isPatient,
    isSupporter,

    // アクション
    refresh: () => updateAuthState(user?.id || null),
  }
}

/**
 * 認証が必要な処理用フック
 * 認証されていない場合はエラーを投げる
 */
export function useRequireAuth(): AuthUser {
  const { user, isLoading, isAuthenticated } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      throw new Error('認証が必要です')
    }
  }, [isLoading, isAuthenticated])

  if (!user) {
    throw new Error('認証情報が取得できません')
  }

  return user
}
