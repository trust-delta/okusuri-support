/**
 * Supabase認証API関数
 * 型安全でエラーハンドリングを含む認証機能
 */

import { convertSupabaseError, logAuthError } from '@/lib/error/auth-error'
import type { AuthUser } from '@/lib/supabase/types'
import type {
  AuthCheck,
  AuthResponse,
  AuthSession,
  ResetPasswordParams,
  SignInParams,
  SignUpParams,
  UpdatePasswordParams,
  UpdateProfileParams,
} from '@/types/auth'
import type { Session, User } from '@supabase/supabase-js'
import { getContextualClient } from './client'

/**
 * ユーザー登録（サインアップ）
 */
export async function signUp(params: SignUpParams): Promise<AuthResponse<AuthUser>> {
  try {
    logAuthOperation('signUp', { email: params.email })

    const supabase = await getContextualClient()

    // 入力バリデーション
    const validationError = validateSignUpParams(params)
    if (validationError) {
      return validationError
    }

    const { data, error } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: {
          display_name: params.displayName || null,
          phone_number: params.phoneNumber || null,
        },
      },
    })

    if (error) {
      const authError = convertSupabaseError(error)
      logAuthError(authError, 'signUp')
      return {
        success: false,
        error: {
          type: authError.type,
          message: authError.userMessage,
          ...(authError.code && { code: authError.code }),
        },
      }
    }

    if (!data.user) {
      return {
        success: false,
        error: {
          type: 'UNKNOWN_ERROR',
          message: 'ユーザー作成に失敗しました。',
        },
      }
    }

    // AuthUserに変換
    const authUser = convertToAuthUser(data.user, params.displayName)
    const authSession = data.session ? convertToAuthSession(data.session, authUser) : undefined

    return {
      success: true,
      data: authUser,
      user: authUser,
      ...(authSession && { session: authSession }),
    }
  } catch (error) {
    const authError = convertSupabaseError(error)
    logAuthError(authError, 'signUp')
    return {
      success: false,
      error: {
        type: authError.type,
        message: authError.userMessage,
        ...(authError.code && { code: authError.code }),
      },
    }
  }
}

/**
 * サインイン（ログイン）
 */
export async function signIn(params: SignInParams): Promise<AuthResponse<AuthUser>> {
  try {
    logAuthOperation('signIn', { email: params.email })

    const supabase = await getContextualClient()

    // 入力バリデーション
    const validationError = validateSignInParams(params)
    if (validationError) {
      return validationError
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: params.email,
      password: params.password,
    })

    if (error) {
      const authError = convertSupabaseError(error)
      logAuthError(authError, 'signIn')
      return {
        success: false,
        error: {
          type: authError.type,
          message: authError.userMessage,
          ...(authError.code && { code: authError.code }),
        },
      }
    }

    if (!data.user || !data.session) {
      return {
        success: false,
        error: {
          type: 'INVALID_CREDENTIALS',
          message: 'ログインに失敗しました。',
        },
      }
    }

    // AuthUserとAuthSessionに変換
    const authUser = convertToAuthUser(data.user)
    const authSession = convertToAuthSession(data.session, authUser)

    return {
      success: true,
      data: authUser,
      user: authUser,
      ...(authSession && { session: authSession }),
    }
  } catch (error) {
    const authError = convertSupabaseError(error)
    logAuthError(authError, 'signIn')
    return {
      success: false,
      error: {
        type: authError.type,
        message: authError.userMessage,
        ...(authError.code && { code: authError.code }),
      },
    }
  }
}

/**
 * サインアウト（ログアウト）
 */
export async function signOut(): Promise<AuthResponse> {
  try {
    logAuthOperation('signOut')

    const supabase = await getContextualClient()

    const { error } = await supabase.auth.signOut()

    if (error) {
      const authError = convertSupabaseError(error)
      logAuthError(authError, 'signOut')
      return {
        success: false,
        error: {
          type: authError.type,
          message: authError.userMessage,
          ...(authError.code && { code: authError.code }),
        },
      }
    }

    return {
      success: true,
      data: null,
    }
  } catch (error) {
    const authError = convertSupabaseError(error)
    logAuthError(authError, 'signOut')
    return {
      success: false,
      error: {
        type: authError.type,
        message: authError.userMessage,
        ...(authError.code && { code: authError.code }),
      },
    }
  }
}

/**
 * 現在のユーザー情報を取得
 */
export async function getUser(): Promise<AuthUser | null> {
  try {
    logAuthOperation('getUser')

    const supabase = await getContextualClient()

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      logAuthError(convertSupabaseError(error), 'getUser')
      return null
    }

    if (!user) {
      return null
    }

    return convertToAuthUser(user)
  } catch (error) {
    logAuthError(convertSupabaseError(error), 'getUser')
    return null
  }
}

/**
 * セッションを更新
 */
export async function refreshSession(): Promise<AuthResponse<AuthSession>> {
  try {
    logAuthOperation('refreshSession')

    const supabase = await getContextualClient()

    const { data, error } = await supabase.auth.refreshSession()

    if (error) {
      const authError = convertSupabaseError(error)
      logAuthError(authError, 'refreshSession')
      return {
        success: false,
        error: {
          type: authError.type,
          message: authError.userMessage,
          ...(authError.code && { code: authError.code }),
        },
      }
    }

    if (!data.session || !data.user) {
      return {
        success: false,
        error: {
          type: 'SESSION_EXPIRED',
          message: 'セッションの更新に失敗しました。',
        },
      }
    }

    const authUser = convertToAuthUser(data.user)
    const authSession = convertToAuthSession(data.session, authUser)

    return {
      success: true,
      data: authSession,
      ...(authSession && { session: authSession }),
    }
  } catch (error) {
    const authError = convertSupabaseError(error)
    logAuthError(authError, 'refreshSession')
    return {
      success: false,
      error: {
        type: authError.type,
        message: authError.userMessage,
        ...(authError.code && { code: authError.code }),
      },
    }
  }
}

/**
 * 認証状態をチェック
 */
export async function checkAuth(): Promise<AuthCheck> {
  try {
    logAuthOperation('checkAuth')

    const supabase = await getContextualClient()

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error) {
      logAuthError(convertSupabaseError(error), 'checkAuth')
      return {
        isAuthenticated: false,
        user: null,
        requiresRefresh: false,
      }
    }

    if (!session) {
      return {
        isAuthenticated: false,
        user: null,
        requiresRefresh: false,
      }
    }

    const authUser = convertToAuthUser(session.user)

    // セッションの有効期限をチェック
    const expiresAt = new Date(session.expires_at || 0).getTime()
    const now = Date.now()
    const refreshThreshold = 5 * 60 * 1000 // 5分前

    const requiresRefresh = expiresAt - now < refreshThreshold

    return {
      isAuthenticated: true,
      user: authUser,
      requiresRefresh,
    }
  } catch (error) {
    logAuthError(convertSupabaseError(error), 'checkAuth')
    return {
      isAuthenticated: false,
      user: null,
      requiresRefresh: false,
    }
  }
}

/**
 * パスワードリセット
 */
export async function resetPassword(params: ResetPasswordParams): Promise<AuthResponse> {
  try {
    logAuthOperation('resetPassword', { email: params.email })

    const supabase = await getContextualClient()

    const { error } = await supabase.auth.resetPasswordForEmail(params.email)

    if (error) {
      const authError = convertSupabaseError(error)
      logAuthError(authError, 'resetPassword')
      return {
        success: false,
        error: {
          type: authError.type,
          message: authError.userMessage,
          ...(authError.code && { code: authError.code }),
        },
      }
    }

    return {
      success: true,
      data: null,
    }
  } catch (error) {
    const authError = convertSupabaseError(error)
    logAuthError(authError, 'resetPassword')
    return {
      success: false,
      error: {
        type: authError.type,
        message: authError.userMessage,
        ...(authError.code && { code: authError.code }),
      },
    }
  }
}

/**
 * パスワード更新
 */
export async function updatePassword(params: UpdatePasswordParams): Promise<AuthResponse> {
  try {
    logAuthOperation('updatePassword')

    const supabase = await getContextualClient()

    const { error } = await supabase.auth.updateUser({
      password: params.password,
    })

    if (error) {
      const authError = convertSupabaseError(error)
      logAuthError(authError, 'updatePassword')
      return {
        success: false,
        error: {
          type: authError.type,
          message: authError.userMessage,
          ...(authError.code && { code: authError.code }),
        },
      }
    }

    return {
      success: true,
      data: null,
    }
  } catch (error) {
    const authError = convertSupabaseError(error)
    logAuthError(authError, 'updatePassword')
    return {
      success: false,
      error: {
        type: authError.type,
        message: authError.userMessage,
        ...(authError.code && { code: authError.code }),
      },
    }
  }
}

/**
 * プロファイル更新
 */
export async function updateProfile(params: UpdateProfileParams): Promise<AuthResponse<AuthUser>> {
  try {
    logAuthOperation('updateProfile')

    const supabase = await getContextualClient()

    const { data, error } = await supabase.auth.updateUser({
      data: {
        display_name: params.displayName || null,
        phone_number: params.phoneNumber || null,
      },
    })

    if (error) {
      const authError = convertSupabaseError(error)
      logAuthError(authError, 'updateProfile')
      return {
        success: false,
        error: {
          type: authError.type,
          message: authError.userMessage,
          ...(authError.code && { code: authError.code }),
        },
      }
    }

    if (!data.user) {
      return {
        success: false,
        error: {
          type: 'UNKNOWN_ERROR',
          message: 'プロファイル更新に失敗しました。',
        },
      }
    }

    const authUser = convertToAuthUser(data.user)

    return {
      success: true,
      data: authUser,
      user: authUser,
    }
  } catch (error) {
    const authError = convertSupabaseError(error)
    logAuthError(authError, 'updateProfile')
    return {
      success: false,
      error: {
        type: authError.type,
        message: authError.userMessage,
        ...(authError.code && { code: authError.code }),
      },
    }
  }
}

// ヘルパー関数群

/**
 * SupabaseのUserをAuthUserに変換
 */
function convertToAuthUser(user: User, overrideDisplayName?: string): AuthUser {
  return {
    id: user.id,
    email: user.email || '',
    role: user.user_metadata?.['role'] || 'patient',
    displayName: overrideDisplayName || user.user_metadata?.['display_name'] || null,
    phoneNumber: user.user_metadata?.['phone_number'] || null,
  }
}

/**
 * SupabaseのSessionをAuthSessionに変換
 */
function convertToAuthSession(session: Session, user: AuthUser): AuthSession {
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ? new Date(session.expires_at).getTime() : Date.now() + 3600000,
    user,
  }
}

/**
 * サインアップパラメータのバリデーション
 */
function validateSignUpParams(params: SignUpParams): AuthResponse<AuthUser> | null {
  if (!params.email) {
    return {
      success: false,
      error: {
        type: 'INVALID_EMAIL_FORMAT',
        message: 'メールアドレスを入力してください。',
      },
    }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(params.email)) {
    return {
      success: false,
      error: {
        type: 'INVALID_EMAIL_FORMAT',
        message: 'メールアドレスの形式が正しくありません。',
      },
    }
  }

  if (!params.password) {
    return {
      success: false,
      error: {
        type: 'WEAK_PASSWORD',
        message: 'パスワードを入力してください。',
      },
    }
  }

  if (params.password.length < 8) {
    return {
      success: false,
      error: {
        type: 'WEAK_PASSWORD',
        message: 'パスワードは8文字以上で入力してください。',
      },
    }
  }

  return null
}

/**
 * サインインパラメータのバリデーション
 */
function validateSignInParams(params: SignInParams): AuthResponse<AuthUser> | null {
  if (!params.email) {
    return {
      success: false,
      error: {
        type: 'INVALID_EMAIL_FORMAT',
        message: 'メールアドレスを入力してください。',
      },
    }
  }

  if (!params.password) {
    return {
      success: false,
      error: {
        type: 'INVALID_CREDENTIALS',
        message: 'パスワードを入力してください。',
      },
    }
  }

  return null
}

/**
 * 認証操作のログ出力
 */
function logAuthOperation(operation: string, data?: Record<string, unknown>): void {
  const logData = {
    operation,
    timestamp: new Date().toISOString(),
    ...data,
  }

  // 本番環境では詳細なログを出力しない
  if (process.env.NODE_ENV !== 'production') {
    console.log('[AUTH_OPERATION]', logData)
  }
}
