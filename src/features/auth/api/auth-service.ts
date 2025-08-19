/**
 * 認証API サービス層
 * Supabase認証機能のラッパー
 */

import { createServerSupabaseClient, getSupabaseClient } from '@/lib/supabase'
import type {
  AuthError,
  AuthResponse,
  AuthUser,
  ResetPasswordFormData,
  SignInFormData,
  SignUpFormData,
} from '../types'

/**
 * Supabaseエラーを統一エラー形式に変換
 */
function transformSupabaseError(error: unknown): AuthError {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const supabaseError = error as { message: string; status?: number }

    // よくあるエラーパターンの日本語化
    const errorMessages: Record<string, string> = {
      'Invalid email or password': 'メールアドレスまたはパスワードが正しくありません',
      'Email not confirmed': 'メールアドレスが確認されていません',
      'User already registered': 'このメールアドレスは既に登録されています',
      'Password should be at least 6 characters': 'パスワードは6文字以上で入力してください',
      'Signup is disabled': 'ユーザー登録は現在無効になっています',
      'Email rate limit exceeded':
        'メール送信の制限に達しました。しばらく時間をおいて再度お試しください',
    }

    return {
      code: 'AUTH_ERROR',
      message: errorMessages[supabaseError.message] || supabaseError.message,
      details: supabaseError.message,
    }
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'エラーが発生しました。再度お試しください。',
    details: String(error),
  }
}

/**
 * SupabaseユーザーをAuthUserに変換
 */
async function transformToAuthUser(userId: string): Promise<AuthUser | null> {
  try {
    const supabase = getSupabaseClient()
    const { data: user, error } = await supabase.from('users').select('*').eq('id', userId).single()

    if (error || !user) {
      console.warn('ユーザー情報の取得に失敗:', error)
      return null
    }

    const { data: authData } = await supabase.auth.getUser()

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      displayName: user.display_name,
      phoneNumber: user.phone_number,
      emailConfirmed: authData.user?.email_confirmed_at != null,
    }
  } catch (error) {
    console.error('ユーザー変換エラー:', error)
    return null
  }
}

/**
 * ユーザー登録
 */
export async function signUp(
  formData: SignUpFormData
): Promise<AuthResponse<{ needsConfirmation: boolean }>> {
  try {
    const supabase = getSupabaseClient()

    // Supabase認証でユーザー作成
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    })

    if (authError) {
      return {
        success: false,
        error: transformSupabaseError(authError),
      }
    }

    if (!authData.user) {
      return {
        success: false,
        error: {
          code: 'SIGNUP_FAILED',
          message: 'ユーザー登録に失敗しました',
        },
      }
    }

    // usersテーブルにプロファイル情報を保存
    const { error: profileError } = await supabase.from('users').insert({
      id: authData.user.id,
      email: formData.email,
      role: formData.role,
      display_name: formData.displayName || null,
      phone_number: formData.phoneNumber || null,
    })

    if (profileError) {
      // プロファイル保存に失敗した場合、認証ユーザーを削除
      await supabase.auth.admin.deleteUser(authData.user.id)

      return {
        success: false,
        error: transformSupabaseError(profileError),
      }
    }

    return {
      success: true,
      data: {
        needsConfirmation: !authData.user.email_confirmed_at,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: transformSupabaseError(error),
    }
  }
}

/**
 * ログイン
 */
export async function signIn(formData: SignInFormData): Promise<AuthResponse<AuthUser>> {
  try {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    })

    if (error) {
      return {
        success: false,
        error: transformSupabaseError(error),
      }
    }

    if (!data.user) {
      return {
        success: false,
        error: {
          code: 'SIGNIN_FAILED',
          message: 'ログインに失敗しました',
        },
      }
    }

    const authUser = await transformToAuthUser(data.user.id)
    if (!authUser) {
      return {
        success: false,
        error: {
          code: 'USER_PROFILE_NOT_FOUND',
          message: 'ユーザー情報が見つかりません',
        },
      }
    }

    return {
      success: true,
      data: authUser,
    }
  } catch (error) {
    return {
      success: false,
      error: transformSupabaseError(error),
    }
  }
}

/**
 * ログアウト
 */
export async function signOut(): Promise<AuthResponse> {
  try {
    const supabase = getSupabaseClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      return {
        success: false,
        error: transformSupabaseError(error),
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: transformSupabaseError(error),
    }
  }
}

/**
 * パスワードリセット
 */
export async function resetPassword(formData: ResetPasswordFormData): Promise<AuthResponse> {
  try {
    const supabase = getSupabaseClient()

    const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    if (error) {
      return {
        success: false,
        error: transformSupabaseError(error),
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: transformSupabaseError(error),
    }
  }
}

/**
 * 現在のユーザー情報取得
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const supabase = getSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return null

    return await transformToAuthUser(user.id)
  } catch (error) {
    console.error('現在のユーザー取得エラー:', error)
    return null
  }
}

/**
 * サーバーサイド用：現在のユーザー情報取得
 */
export async function getCurrentUserServer(): Promise<AuthUser | null> {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return null

    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error || !userData) {
      return null
    }

    return {
      id: userData.id,
      email: userData.email,
      role: userData.role,
      displayName: userData.display_name,
      phoneNumber: userData.phone_number,
      emailConfirmed: user.email_confirmed_at != null,
    }
  } catch (error) {
    console.error('サーバーサイドユーザー取得エラー:', error)
    return null
  }
}
