/**
 * 認証状態管理 - Zustand store
 * グローバル認証状態管理、リアクティブ更新、永続化を提供
 */

import type { AuthSession, AuthUser } from '@/lib/supabase/types'
import type { AuthError, AuthResponse } from '@/types/auth'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * 認証状態の型定義
 */
export interface AuthState {
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
}

/**
 * 認証アクションの型定義
 */
export interface AuthActions {
  /** ユーザー情報を設定 */
  setUser: (user: AuthUser | null) => void
  /** セッション情報を設定 */
  setSession: (session: AuthSession | null) => void
  /** ローディング状態を設定 */
  setLoading: (loading: boolean) => void
  /** エラー情報を設定 */
  setError: (error: AuthError['error'] | null) => void
  /** 認証状態をリセット */
  reset: () => void
  /** 認証成功時の状態更新 */
  setAuthenticated: (user: AuthUser, session?: AuthSession) => void
  /** 認証失敗時の状態更新 */
  setUnauthenticated: (error?: AuthError['error']) => void
  /** 初期化完了をマーク */
  setInitialized: () => void
}

/**
 * Zustand認証ストア型
 */
export type AuthStore = AuthState & AuthActions

/**
 * 初期状態
 */
const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: true, // 初期化時はloading=true
  user: null,
  session: null,
  error: null,
  isInitialized: false,
}

/**
 * ブラウザ環境でのみlocalStorageを使用
 */
const createStorage = () => {
  if (typeof window === 'undefined') {
    // SSR環境ではダミーのストレージを返す
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    }
  }
  return localStorage
}

/**
 * Zustand認証ストア - 永続化対応
 */
export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      ...initialState,

      setUser: (user: AuthUser | null) => {
        set({ user })
      },

      setSession: (session: AuthSession | null) => {
        set({ session })
      },

      setLoading: (isLoading: boolean) => {
        set({ isLoading })
      },

      setError: (error: AuthError['error'] | null) => {
        set({ error })
      },

      reset: () => {
        set({
          ...initialState,
          isLoading: false,
          isInitialized: true,
        })
      },

      setAuthenticated: (user: AuthUser, session?: AuthSession) => {
        set({
          isAuthenticated: true,
          isLoading: false,
          user,
          session: session || null,
          error: null,
          isInitialized: true,
        })
      },

      setUnauthenticated: (error?: AuthError['error']) => {
        set({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          session: null,
          error: error || null,
          isInitialized: true,
        })
      },

      setInitialized: () => {
        set({ isInitialized: true, isLoading: false })
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => createStorage()),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        isInitialized: state.isInitialized,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // セッション情報はセキュリティ上永続化しない
          state.isLoading = false
          state.session = null
          state.error = null
        }
      },
    }
  )
)

/**
 * 認証状態の selector
 */
export const authSelectors = {
  /** 認証状態のみを取得 */
  getAuthStatus: () => useAuthStore.getState().isAuthenticated,

  /** ユーザー情報のみを取得 */
  getUser: () => useAuthStore.getState().user,

  /** ローディング状態のみを取得 */
  getLoadingState: () => useAuthStore.getState().isLoading,

  /** 初期化状態のみを取得 */
  getInitializedState: () => useAuthStore.getState().isInitialized,
}

/**
 * 型安全なストアアクセス用のヘルパー
 */
export const authStoreHelpers = {
  /** 認証成功時の統一的な状態更新 */
  handleAuthSuccess: (response: AuthResponse<AuthUser>) => {
    if (response.success && response.user) {
      useAuthStore.getState().setAuthenticated(response.user, response.session)
    }
  },

  /** 認証失敗時の統一的な状態更新 */
  handleAuthError: (response: AuthResponse) => {
    if (!response.success) {
      useAuthStore.getState().setUnauthenticated(response.error)
    }
  },
}
