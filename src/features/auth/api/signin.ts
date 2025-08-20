/**
 * サインイン専用API
 * メール・パスワード認証フローに特化したサインイン機能
 * セキュリティ強化とセッション管理機能を含む
 */

import { getSupabaseClient } from '@/lib/supabase'
import type { SignInRequest, SignInResult } from '../schemas/signin'

/**
 * セキュリティ設定
 */
const SECURITY_CONFIG = {
  // セッション有効期限: 7日間（rememberMe時）、24時間（通常）
  SESSION_DURATION_REMEMBER: 7 * 24 * 60 * 60, // 7 days in seconds
  SESSION_DURATION_DEFAULT: 24 * 60 * 60, // 24 hours in seconds

  // ログイン試行回数制限
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes in milliseconds
} as const

/**
 * Supabaseエラーを統一エラー形式に変換
 */
function transformSupabaseError(
  error: unknown,
  field?: keyof SignInRequest
): NonNullable<SignInResult['error']> {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const supabaseError = error as { message: string; status?: number }

    // よくあるエラーパターンの日本語化とフィールド特定
    const errorMappings: Record<string, { message: string; field?: keyof SignInRequest }> = {
      'Invalid login credentials': {
        message: 'メールアドレスまたはパスワードが正しくありません',
        // field: undefined, // 両方の可能性があるため特定しない
      },
      'Email not confirmed': {
        message: 'メールアドレスが確認されていません。確認メールをご確認ください',
        field: 'email',
      },
      'Invalid email': {
        message: 'メールアドレスの形式が正しくありません',
        field: 'email',
      },
      'User not found': {
        message: 'アカウントが見つかりません。メールアドレスを確認してください',
        field: 'email',
      },
      'Signup is disabled': {
        message: 'アカウント登録が無効になっています',
      },
      'Email rate limit exceeded': {
        message: 'ログイン試行の制限に達しました。しばらく時間をおいて再度お試しください',
      },
    }

    const mapping = errorMappings[supabaseError.message]
    const finalField = mapping?.field || field

    return {
      code: 'SIGNIN_ERROR',
      message: mapping?.message || supabaseError.message,
      details: supabaseError.message,
      ...(finalField && { field: finalField }),
    }
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'ログイン処理中にエラーが発生しました。再度お試しください。',
    details: String(error),
    ...(field && { field }),
  }
}

/**
 * ログイン試行回数制限チェック
 */
function checkLoginAttempts(email: string): { allowed: boolean; waitTime?: number } {
  const storageKey = `login_attempts_${email}`
  const attemptData = localStorage.getItem(storageKey)

  if (!attemptData) {
    return { allowed: true }
  }

  try {
    const { count, lastAttempt }: { count: number; lastAttempt: number } = JSON.parse(attemptData)
    const now = Date.now()

    // ロックアウト期間が過ぎていれば試行回数をリセット
    if (now - lastAttempt > SECURITY_CONFIG.LOCKOUT_DURATION) {
      localStorage.removeItem(storageKey)
      return { allowed: true }
    }

    // 試行回数が上限に達している場合
    if (count >= SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS) {
      const waitTime = Math.ceil((SECURITY_CONFIG.LOCKOUT_DURATION - (now - lastAttempt)) / 1000)
      return { allowed: false, waitTime }
    }

    return { allowed: true }
  } catch {
    // パース失敗時はデータをクリアして許可
    localStorage.removeItem(storageKey)
    return { allowed: true }
  }
}

/**
 * ログイン試行回数を記録
 */
function recordLoginAttempt(email: string, success: boolean): void {
  const storageKey = `login_attempts_${email}`

  if (success) {
    // 成功時は試行回数をクリア
    localStorage.removeItem(storageKey)
    return
  }

  // 失敗時は試行回数を増加
  const attemptData = localStorage.getItem(storageKey)
  const now = Date.now()

  if (!attemptData) {
    localStorage.setItem(storageKey, JSON.stringify({ count: 1, lastAttempt: now }))
  } else {
    try {
      const { count }: { count: number } = JSON.parse(attemptData)
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          count: count + 1,
          lastAttempt: now,
        })
      )
    } catch {
      localStorage.setItem(storageKey, JSON.stringify({ count: 1, lastAttempt: now }))
    }
  }
}

/**
 * セッション有効期限を設定
 */
async function configureSessionDuration(rememberMe = false): Promise<void> {
  try {
    // const supabase = getSupabaseClient()

    // Supabaseの設定でセッション有効期限を調整
    // 注意: Supabase自体のセッション期限は設定で制御されるため
    // ここではクライアント側での追加セキュリティ対策を実装

    if (rememberMe) {
      // rememberMeがtrueの場合、セッション情報をlocalStorageに保存
      const sessionData = {
        rememberMe: true,
        timestamp: Date.now(),
        duration: SECURITY_CONFIG.SESSION_DURATION_REMEMBER * 1000,
      }
      localStorage.setItem('auth_session_config', JSON.stringify(sessionData))
    } else {
      // rememberMeがfalseの場合、sessionStorageを使用
      const sessionData = {
        rememberMe: false,
        timestamp: Date.now(),
        duration: SECURITY_CONFIG.SESSION_DURATION_DEFAULT * 1000,
      }
      sessionStorage.setItem('auth_session_config', JSON.stringify(sessionData))
    }
  } catch (error) {
    console.warn('セッション設定エラー:', error)
    // エラーが発生してもログイン処理は続行
  }
}

/**
 * セッション有効性をチェック
 */
export function isSessionValid(): boolean {
  try {
    // localStorage（rememberMe）とsessionStorage（通常）の両方をチェック
    const localData = localStorage.getItem('auth_session_config')
    const sessionData = sessionStorage.getItem('auth_session_config')

    const configData = localData || sessionData

    if (!configData) {
      return false
    }

    const { timestamp, duration }: { timestamp: number; duration: number } = JSON.parse(configData)
    const now = Date.now()

    return now - timestamp < duration
  } catch {
    return false
  }
}

/**
 * セッション設定をクリア
 */
export function clearSessionConfig(): void {
  localStorage.removeItem('auth_session_config')
  sessionStorage.removeItem('auth_session_config')
}

/**
 * メール・パスワード認証サインイン
 */
export async function signInWithEmailPassword(formData: SignInRequest): Promise<SignInResult> {
  try {
    // ログイン試行回数制限チェック
    const attemptCheck = checkLoginAttempts(formData.email)
    if (!attemptCheck.allowed) {
      return {
        success: false,
        error: {
          code: 'TOO_MANY_ATTEMPTS',
          message: `ログイン試行回数が上限に達しました。${attemptCheck.waitTime}秒後に再試行してください。`,
          details: `Wait time: ${attemptCheck.waitTime} seconds`,
        },
      }
    }

    const supabase = getSupabaseClient()

    // Supabase認証でユーザーサインイン
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    })

    if (authError) {
      // ログイン失敗を記録
      recordLoginAttempt(formData.email, false)

      return {
        success: false,
        error: transformSupabaseError(authError),
      }
    }

    if (!authData.user || !authData.session) {
      return {
        success: false,
        error: {
          code: 'SIGNIN_FAILED',
          message: 'ログインに失敗しました',
        },
      }
    }

    // usersテーブルからプロファイル情報を取得
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, email, role, display_name, phone_number')
      .eq('id', authData.user.id)
      .single()

    if (profileError) {
      console.error('プロファイル取得エラー:', profileError)
      // プロファイル取得に失敗してもログイン自体は成功とする
      // ただし、ユーザーにはプロファイル更新を促すメッセージを表示する予定
    }

    // ログイン成功を記録
    recordLoginAttempt(formData.email, true)

    // セッション設定を適用
    await configureSessionDuration(formData.rememberMe)

    return {
      success: true,
      data: {
        userId: authData.user.id,
        sessionId: authData.session.access_token,
        needsEmailConfirmation: !authData.user.email_confirmed_at,
        ...(userProfile?.role === 'patient' && { redirectTo: '/patient/dashboard' }),
        ...(userProfile?.role === 'supporter' && { redirectTo: '/supporter/dashboard' }),
      },
    }
  } catch (error) {
    console.error('サインインエラー:', error)
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'ログイン処理中にエラーが発生しました。再度お試しください。',
        details: String(error),
      },
    }
  }
}

/**
 * ログアウト処理
 */
export async function signOut(): Promise<void> {
  try {
    const supabase = getSupabaseClient()

    const { error } = await supabase.auth.signOut()

    if (error) {
      throw new Error(`ログアウトに失敗しました: ${error.message}`)
    }

    // セッション設定とログイン試行回数をクリア
    clearSessionConfig()

    // すべてのログイン試行回数制限データをクリア
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('login_attempts_')) {
        keysToRemove.push(key)
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key)
    }

    console.log('ログアウト完了')
  } catch (error) {
    console.error('ログアウトエラー:', error)
    // ログアウトエラーは呼び出し元に伝播する
    throw error
  }
}

/**
 * セッション復元処理（自動ログイン）
 */
export async function restoreSession(): Promise<{
  success: boolean
  userId?: string
  error?: string
}> {
  try {
    // まずクライアント側のセッション有効性をチェック
    if (!isSessionValid()) {
      clearSessionConfig()
      return {
        success: false,
        error: 'セッションの有効期限が切れています',
      }
    }

    const supabase = getSupabaseClient()

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error) {
      clearSessionConfig()
      return {
        success: false,
        error: 'セッション復元に失敗しました',
      }
    }

    if (!session || !session.user) {
      clearSessionConfig()
      return {
        success: false,
        error: '有効なセッションが見つかりません',
      }
    }

    // セッション有効期限が近い場合は自動リフレッシュ
    const expiresAt = session.expires_at
    if (expiresAt) {
      const now = Math.floor(Date.now() / 1000)
      const timeUntilExpiry = expiresAt - now

      // 5分以内に期限切れの場合はリフレッシュ
      if (timeUntilExpiry < 300) {
        const refreshResult = await refreshSession()
        if (!refreshResult.success) {
          clearSessionConfig()
          return {
            success: false,
            error: 'セッションのリフレッシュに失敗しました',
          }
        }
      }
    }

    return {
      success: true,
      userId: session.user.id,
    }
  } catch (error) {
    console.error('セッション復元エラー:', error)
    clearSessionConfig()
    return {
      success: false,
      error: 'セッション復元処理中にエラーが発生しました',
    }
  }
}

/**
 * セッションリフレッシュ処理
 */
export async function refreshSession(): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = getSupabaseClient()

    const { error } = await supabase.auth.refreshSession()

    if (error) {
      return {
        success: false,
        error: 'セッションリフレッシュに失敗しました',
      }
    }

    return { success: true }
  } catch (error) {
    console.error('セッションリフレッシュエラー:', error)
    return {
      success: false,
      error: 'セッションリフレッシュ処理中にエラーが発生しました',
    }
  }
}
