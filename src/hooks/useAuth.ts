/**
 * 認証フック - useAuth
 * 認証状態の管理とアクセス、操作関数を提供
 */

import {
  checkAuth,
  refreshSession,
  resetPassword,
  signIn,
  signOut,
  signUp,
  updatePassword,
  updateProfile,
} from '@/lib/supabase/auth'
import type { AuthSession, AuthUser } from '@/lib/supabase/types'
import { useAuthStore } from '@/stores/auth'
import type {
  AuthCheck,
  AuthError,
  AuthResponse,
  ResetPasswordParams,
  SignInParams,
  SignUpParams,
  UpdatePasswordParams,
  UpdateProfileParams,
} from '@/types/auth'
import { useCallback, useEffect } from 'react'

/**
 * useAuth hookの戻り値型
 */
export interface UseAuthReturn {
  // 状態
  /** 認証済みかどうか */
  isAuthenticated: boolean
  /** ローディング状態 */
  isLoading: boolean
  /** 現在のユーザー情報 */
  user: AuthUser | null
  /** 現在のセッション情報 */
  session: AuthSession | null
  /** エラー情報 */
  error: AuthError['error'] | null
  /** 初期化完了フラグ */
  isInitialized: boolean

  // 認証操作
  /** サインアップ */
  handleSignUp: (params: SignUpParams) => Promise<AuthResponse<AuthUser>>
  /** サインイン */
  handleSignIn: (params: SignInParams) => Promise<AuthResponse<AuthUser>>
  /** サインアウト */
  handleSignOut: () => Promise<AuthResponse>
  /** パスワードリセット */
  handleResetPassword: (params: ResetPasswordParams) => Promise<AuthResponse>
  /** パスワード更新 */
  handleUpdatePassword: (params: UpdatePasswordParams) => Promise<AuthResponse>
  /** プロファイル更新 */
  handleUpdateProfile: (params: UpdateProfileParams) => Promise<AuthResponse<AuthUser>>
  /** セッション更新 */
  handleRefreshSession: () => Promise<AuthResponse<AuthSession>>
  /** 認証チェック */
  handleCheckAuth: () => Promise<AuthCheck>

  // ユーティリティ
  /** エラーをクリア */
  clearError: () => void
  /** 状態をリセット */
  resetAuth: () => void
}

/**
 * 認証フック
 * Zustandストアと連携した認証状態管理とAPI呼び出しを提供
 */
export function useAuth(): UseAuthReturn {
  // Zustandストアから状態を取得
  const {
    isAuthenticated,
    isLoading,
    user,
    session,
    error,
    isInitialized,
    setLoading,
    setError,
    setAuthenticated,
    setUnauthenticated,
    reset,
    setInitialized,
  } = useAuthStore()

  /**
   * 認証状態の初期化
   */
  const initializeAuth = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const authCheck = await checkAuth()

      if (authCheck.isAuthenticated && authCheck.user) {
        // セッション更新が必要な場合は更新
        if (authCheck.requiresRefresh) {
          const refreshResult = await refreshSession()
          if (refreshResult.success && refreshResult.session) {
            setAuthenticated(refreshResult.session.user, refreshResult.session)
          } else {
            setUnauthenticated()
          }
        } else {
          setAuthenticated(authCheck.user)
        }
      } else {
        setUnauthenticated()
      }
    } catch (error) {
      console.error('Auth initialization failed:', error)
      setUnauthenticated({
        type: 'UNKNOWN_ERROR',
        message: '認証状態の初期化に失敗しました。',
      })
    } finally {
      setInitialized()
    }
  }, [setLoading, setError, setAuthenticated, setUnauthenticated, setInitialized])

  // 初期化処理 - ページロード時に認証状態をチェック
  useEffect(() => {
    if (!isInitialized) {
      initializeAuth()
    }
  }, [isInitialized, initializeAuth])

  /**
   * サインアップ処理
   */
  const handleSignUp = useCallback(
    async (params: SignUpParams): Promise<AuthResponse<AuthUser>> => {
      try {
        setLoading(true)
        setError(null)

        const response = await signUp(params)

        if (response.success && response.user) {
          setAuthenticated(response.user, response.session)
        } else if (!response.success) {
          setError(response.error)
        }

        return response
      } catch (_error) {
        const errorMessage = {
          type: 'UNKNOWN_ERROR' as const,
          message: 'サインアップ処理中にエラーが発生しました。',
        }
        setError(errorMessage)
        return {
          success: false,
          error: errorMessage,
        }
      } finally {
        setLoading(false)
      }
    },
    [setLoading, setError, setAuthenticated]
  )

  /**
   * サインイン処理
   */
  const handleSignIn = useCallback(
    async (params: SignInParams): Promise<AuthResponse<AuthUser>> => {
      try {
        setLoading(true)
        setError(null)

        const response = await signIn(params)

        if (response.success && response.user) {
          setAuthenticated(response.user, response.session)
        } else if (!response.success) {
          setError(response.error)
        }

        return response
      } catch (_error) {
        const errorMessage = {
          type: 'UNKNOWN_ERROR' as const,
          message: 'サインイン処理中にエラーが発生しました。',
        }
        setError(errorMessage)
        return {
          success: false,
          error: errorMessage,
        }
      } finally {
        setLoading(false)
      }
    },
    [setLoading, setError, setAuthenticated]
  )

  /**
   * サインアウト処理
   */
  const handleSignOut = useCallback(async (): Promise<AuthResponse> => {
    try {
      setLoading(true)
      setError(null)

      const response = await signOut()

      if (response.success) {
        reset()
      } else {
        setError(response.error)
      }

      return response
    } catch (_error) {
      const errorMessage = {
        type: 'UNKNOWN_ERROR' as const,
        message: 'サインアウト処理中にエラーが発生しました。',
      }
      setError(errorMessage)
      return {
        success: false,
        error: errorMessage,
      }
    } finally {
      setLoading(false)
    }
  }, [setLoading, setError, reset])

  /**
   * パスワードリセット処理
   */
  const handleResetPassword = useCallback(
    async (params: ResetPasswordParams): Promise<AuthResponse> => {
      try {
        setLoading(true)
        setError(null)

        const response = await resetPassword(params)

        if (!response.success) {
          setError(response.error)
        }

        return response
      } catch (_error) {
        const errorMessage = {
          type: 'UNKNOWN_ERROR' as const,
          message: 'パスワードリセット処理中にエラーが発生しました。',
        }
        setError(errorMessage)
        return {
          success: false,
          error: errorMessage,
        }
      } finally {
        setLoading(false)
      }
    },
    [setLoading, setError]
  )

  /**
   * パスワード更新処理
   */
  const handleUpdatePassword = useCallback(
    async (params: UpdatePasswordParams): Promise<AuthResponse> => {
      try {
        setLoading(true)
        setError(null)

        const response = await updatePassword(params)

        if (!response.success) {
          setError(response.error)
        }

        return response
      } catch (_error) {
        const errorMessage = {
          type: 'UNKNOWN_ERROR' as const,
          message: 'パスワード更新処理中にエラーが発生しました。',
        }
        setError(errorMessage)
        return {
          success: false,
          error: errorMessage,
        }
      } finally {
        setLoading(false)
      }
    },
    [setLoading, setError]
  )

  /**
   * プロファイル更新処理
   */
  const handleUpdateProfile = useCallback(
    async (params: UpdateProfileParams): Promise<AuthResponse<AuthUser>> => {
      try {
        setLoading(true)
        setError(null)

        const response = await updateProfile(params)

        if (response.success && response.user) {
          setAuthenticated(response.user, session || undefined)
        } else if (!response.success) {
          setError(response.error)
        }

        return response
      } catch (_error) {
        const errorMessage = {
          type: 'UNKNOWN_ERROR' as const,
          message: 'プロファイル更新処理中にエラーが発生しました。',
        }
        setError(errorMessage)
        return {
          success: false,
          error: errorMessage,
        }
      } finally {
        setLoading(false)
      }
    },
    [setLoading, setError, setAuthenticated, session]
  )

  /**
   * セッション更新処理
   */
  const handleRefreshSession = useCallback(async (): Promise<AuthResponse<AuthSession>> => {
    try {
      setLoading(true)
      setError(null)

      const response = await refreshSession()

      if (response.success && response.session) {
        setAuthenticated(response.session.user, response.session)
      } else if (!response.success) {
        setError(response.error)
        setUnauthenticated(response.error)
      }

      return response
    } catch (_error) {
      const errorMessage = {
        type: 'UNKNOWN_ERROR' as const,
        message: 'セッション更新処理中にエラーが発生しました。',
      }
      setError(errorMessage)
      return {
        success: false,
        error: errorMessage,
      }
    } finally {
      setLoading(false)
    }
  }, [setLoading, setError, setAuthenticated, setUnauthenticated])

  /**
   * 認証チェック処理
   */
  const handleCheckAuth = useCallback(async (): Promise<AuthCheck> => {
    try {
      return await checkAuth()
    } catch (error) {
      console.error('Auth check failed:', error)
      return {
        isAuthenticated: false,
        user: null,
        requiresRefresh: false,
      }
    }
  }, [])

  /**
   * エラーをクリア
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [setError])

  /**
   * 認証状態をリセット
   */
  const resetAuth = useCallback(() => {
    reset()
  }, [reset])

  return {
    // 状態
    isAuthenticated,
    isLoading,
    user,
    session,
    error,
    isInitialized,

    // 操作
    handleSignUp,
    handleSignIn,
    handleSignOut,
    handleResetPassword,
    handleUpdatePassword,
    handleUpdateProfile,
    handleRefreshSession,
    handleCheckAuth,

    // ユーティリティ
    clearError,
    resetAuth,
  }
}
