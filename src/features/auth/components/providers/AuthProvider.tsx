/**
 * 認証状態管理Provider
 * アプリケーション全体で認証状態を提供
 */

'use client'

import React, { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useAuth } from '../../hooks/use-auth'
import type { AuthUser } from '../../types'

/**
 * AuthProvider Context型定義
 */
interface AuthContextValue {
  /** 認証状態 */
  isLoading: boolean
  isAuthenticated: boolean
  isUnauthenticated: boolean
  hasError: boolean

  /** ユーザー情報 */
  user: AuthUser | null

  /** エラー情報 */
  error: { code: string; message: string } | null

  /** ロールベースアクセス制御 */
  isPatient: boolean
  isSupporter: boolean

  /** アクション */
  refresh: () => void
}

/**
 * AuthContext作成
 */
const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * AuthProvider Props
 */
interface AuthProviderProps {
  children: ReactNode
}

/**
 * AuthProvider実装
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const authData = useAuth()

  // パフォーマンス最適化: 不要な再レンダリングを防止
  const contextValue: AuthContextValue = useMemo(
    () => ({
      isLoading: authData.isLoading,
      isAuthenticated: authData.isAuthenticated,
      isUnauthenticated: authData.isUnauthenticated,
      hasError: authData.hasError,
      user: authData.user,
      error: authData.error,
      isPatient: authData.isPatient,
      isSupporter: authData.isSupporter,
      refresh: authData.refresh,
    }),
    [
      authData.isLoading,
      authData.isAuthenticated,
      authData.isUnauthenticated,
      authData.hasError,
      authData.user,
      authData.error,
      authData.isPatient,
      authData.isSupporter,
      authData.refresh,
    ]
  )

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

/**
 * useAuthContext カスタムフック
 */
export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}
