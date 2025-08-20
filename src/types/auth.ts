/**
 * 認証システムの型定義
 * Supabase認証APIと統合する型安全な定義
 */

import type { AuthUser } from '@/lib/supabase/types'

/**
 * サインアップ時の入力パラメータ
 */
export interface SignUpParams {
  email: string
  password: string
  displayName?: string
  phoneNumber?: string
}

/**
 * サインイン時の入力パラメータ
 */
export interface SignInParams {
  email: string
  password: string
}

/**
 * パスワードリセット時の入力パラメータ
 */
export interface ResetPasswordParams {
  email: string
}

/**
 * パスワード更新時の入力パラメータ
 */
export interface UpdatePasswordParams {
  password: string
}

/**
 * プロファイル更新時の入力パラメータ
 */
export interface UpdateProfileParams {
  displayName?: string
  phoneNumber?: string
}

/**
 * 認証操作の結果型
 */
export interface AuthResult<TData = null> {
  success: true
  data: TData
  user?: AuthUser
  session?: AuthSession
}

/**
 * 認証エラーの結果型
 */
export interface AuthError {
  success: false
  error: {
    type: AuthErrorType
    message: string
    code?: string
    details?: unknown
  }
}

/**
 * 認証操作の統一結果型（Result型パターン）
 */
export type AuthResponse<TData = null> = AuthResult<TData> | AuthError

/**
 * 認証エラーの種類
 */
export type AuthErrorType =
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_NOT_CONFIRMED'
  | 'EMAIL_ALREADY_REGISTERED'
  | 'WEAK_PASSWORD'
  | 'INVALID_EMAIL_FORMAT'
  | 'USER_NOT_FOUND'
  | 'SESSION_EXPIRED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR'

/**
 * 認証セッション情報
 */
export interface AuthSession {
  accessToken: string
  refreshToken: string
  expiresAt: number
  user: AuthUser
}

/**
 * 認証状態の管理
 */
export interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  user: AuthUser | null
  session: AuthSession | null
  error: AuthError | null
}

/**
 * セッション管理の結果型
 */
export interface SessionResult {
  isValid: boolean
  user: AuthUser | null
  expiresAt: number | null
}

/**
 * 認証チェックの結果型
 */
export interface AuthCheck {
  isAuthenticated: boolean
  user: AuthUser | null
  requiresRefresh: boolean
}

/**
 * 型ガード関数用の型定義
 */
export interface AuthGuard {
  isAuthResult: (response: unknown) => response is AuthResult
  isAuthError: (response: unknown) => response is AuthError
  isValidSession: (session: unknown) => session is AuthSession
}

/**
 * 認証コンテキスト用の型定義
 */
export interface AuthContextValue {
  state: AuthState
  signUp: (params: SignUpParams) => Promise<AuthResponse<AuthUser>>
  signIn: (params: SignInParams) => Promise<AuthResponse<AuthUser>>
  signOut: () => Promise<AuthResponse>
  resetPassword: (params: ResetPasswordParams) => Promise<AuthResponse>
  updatePassword: (params: UpdatePasswordParams) => Promise<AuthResponse>
  updateProfile: (params: UpdateProfileParams) => Promise<AuthResponse<AuthUser>>
  refreshSession: () => Promise<AuthResponse<AuthSession>>
  checkAuth: () => Promise<AuthCheck>
}

/**
 * 認証フック用の返り値型
 */
export interface UseAuthReturn extends Omit<AuthContextValue, 'state'> {
  isAuthenticated: boolean
  isLoading: boolean
  user: AuthUser | null
  session: AuthSession | null
  error: AuthError | null
}

/**
 * 認証設定の型定義
 */
export interface AuthConfig {
  sessionTimeout: number
  refreshThreshold: number
  maxRetries: number
  retryDelay: number
  redirectOnError: boolean
  errorRedirectUrl?: string
  successRedirectUrl?: string
}

/**
 * 認証イベントの型定義
 */
export type AuthEventType =
  | 'SIGNED_IN'
  | 'SIGNED_OUT'
  | 'TOKEN_REFRESHED'
  | 'USER_UPDATED'
  | 'PASSWORD_RECOVERY'

/**
 * 認証イベントデータ
 */
export interface AuthEvent {
  type: AuthEventType
  session: AuthSession | null
  user: AuthUser | null
  timestamp: number
}

/**
 * 認証リスナーの型定義
 */
export type AuthEventListener = (event: AuthEvent) => void

/**
 * 認証プロバイダーの設定オプション
 */
export interface AuthProviderOptions {
  config?: Partial<AuthConfig>
  onAuthStateChange?: AuthEventListener
}
