/**
 * サインアップ専用API
 * メール認証フローに特化したサインアップ機能
 */

import { getSupabaseClient } from '@/lib/supabase'
import type { SignUpRequest, SignUpResult } from '../schemas/signup'

/**
 * Supabaseエラーを統一エラー形式に変換
 */
function transformSupabaseError(
  error: unknown,
  field?: keyof SignUpRequest
): NonNullable<SignUpResult['error']> {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const supabaseError = error as { message: string; status?: number }

    // よくあるエラーパターンの日本語化とフィールド特定
    const errorMappings: Record<string, { message: string; field?: keyof SignUpRequest }> = {
      'User already registered': {
        message: 'このメールアドレスは既に登録されています',
        field: 'email',
      },
      'Invalid email': {
        message: 'メールアドレスの形式が正しくありません',
        field: 'email',
      },
      'Password should be at least 6 characters': {
        message: 'パスワードは6文字以上で入力してください',
        field: 'password',
      },
      'Password is too weak': {
        message: 'パスワードが弱すぎます。より強固なパスワードを設定してください',
        field: 'password',
      },
      'Signup is disabled': {
        message: 'ユーザー登録は現在無効になっています',
      },
      'Email rate limit exceeded': {
        message: 'メール送信の制限に達しました。しばらく時間をおいて再度お試しください',
        field: 'email',
      },
    }

    const mapping = errorMappings[supabaseError.message]
    const finalField = mapping?.field || field

    return {
      code: 'SIGNUP_ERROR',
      message: mapping?.message || supabaseError.message,
      details: supabaseError.message,
      ...(finalField && { field: finalField }),
    }
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'エラーが発生しました。再度お試しください。',
    details: String(error),
    ...(field && { field }),
  }
}

/**
 * メール認証サインアップ
 */
export async function signUpWithEmailConfirmation(formData: SignUpRequest): Promise<SignUpResult> {
  try {
    const supabase = getSupabaseClient()

    // メール認証を有効にしてSupabase認証でユーザー作成
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
        data: {
          role: formData.role,
          display_name: formData.displayName || null,
          phone_number: formData.phoneNumber || null,
        },
      },
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
    const { error: profileError } = await supabase.from('users').upsert({
      id: authData.user.id,
      email: formData.email,
      role: formData.role,
      display_name: formData.displayName || null,
      phone_number: formData.phoneNumber || null,
      updated_at: new Date().toISOString(),
    })

    if (profileError) {
      console.error('プロファイル保存エラー:', profileError)
      // プロファイル保存に失敗しても、認証ユーザーは作成済みなので成功とする
      // メール確認後に再度プロファイル情報を保存する仕組みが必要
    }

    return {
      success: true,
      data: {
        userId: authData.user.id,
        needsEmailConfirmation: !authData.user.email_confirmed_at,
        confirmationSentTo: formData.email,
      },
    }
  } catch (error) {
    console.error('サインアップエラー:', error)
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'エラーが発生しました。再度お試しください。',
        details: String(error),
      },
    }
  }
}

/**
 * 確認メール再送信
 */
export async function resendConfirmationEmail(email: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = getSupabaseClient()

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    })

    if (error) {
      const errorMessage =
        error.message === 'Email rate limit exceeded'
          ? 'メール送信の制限に達しました。しばらく時間をおいて再度お試しください'
          : 'メールの再送信に失敗しました'

      return {
        success: false,
        error: errorMessage,
      }
    }

    return { success: true }
  } catch (error) {
    console.error('確認メール再送信エラー:', error)
    return {
      success: false,
      error: 'メールの再送信に失敗しました',
    }
  }
}

/**
 * メール確認トークンの検証
 */
export async function verifyEmailConfirmation(token: string): Promise<{
  success: boolean
  userId?: string
  error?: string
}> {
  try {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'email',
    })

    if (error) {
      let errorMessage = 'メール確認に失敗しました'

      if (error.message.includes('expired')) {
        errorMessage = 'メール確認リンクの有効期限が切れています。再度確認メールを送信してください'
      } else if (error.message.includes('invalid') || error.message === 'Invalid token') {
        errorMessage = 'メール確認リンクが無効です。正しいリンクをクリックしてください'
      }

      return {
        success: false,
        error: errorMessage,
      }
    }

    if (!data.user) {
      return {
        success: false,
        error: 'ユーザー情報の取得に失敗しました',
      }
    }

    // メール確認完了後、プロファイル情報を更新
    await supabase
      .from('users')
      .update({
        email_confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.user.id)

    return {
      success: true,
      userId: data.user.id,
    }
  } catch (error) {
    console.error('メール確認検証エラー:', error)
    return {
      success: false,
      error: 'メール確認処理中にエラーが発生しました',
    }
  }
}
