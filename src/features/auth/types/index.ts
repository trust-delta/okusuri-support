/**
 * 認証機能の型定義
 */

import type { UserRole } from '@/lib/supabase/types'

/**
 * サインアップフォームデータ
 */
export interface SignUpFormData {
  email: string
  password: string
  role: UserRole
  displayName?: string
  phoneNumber?: string
}

/**
 * サインインフォームデータ
 */
export interface SignInFormData {
  email: string
  password: string
}

/**
 * パスワードリセットフォームデータ
 */
export interface ResetPasswordFormData {
  email: string
}

/**
 * 認証エラー型
 */
export interface AuthError {
  code: string
  message: string
  details?: string
}

/**
 * 認証状態
 */
export type AuthState =
  | { status: 'loading' }
  | { status: 'authenticated'; user: AuthUser }
  | { status: 'unauthenticated' }
  | { status: 'error'; error: AuthError }

/**
 * 認証ユーザー情報
 */
export interface AuthUser {
  id: string
  email: string
  role: UserRole
  displayName?: string | null
  phoneNumber?: string | null
  emailConfirmed: boolean
}

/**
 * 認証レスポンス
 */
export interface AuthResponse<T = unknown> {
  success: boolean
  data?: T
  error?: AuthError
}

/**
 * メール確認状態
 */
export interface EmailConfirmationState {
  email: string
  isConfirmed: boolean
  isLoading: boolean
}
