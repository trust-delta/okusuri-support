/**
 * プロファイル管理API
 * RLS準拠のプロファイル取得・更新機能
 */

import { getSupabaseClient } from '@/lib/supabase'
import {
  formatValidationErrors,
  validateProfileUpdate,
  validateSupabaseUser,
} from '../schemas/profile'
import type {
  AuthError,
  AuthResponse,
  ProfileResult,
  ProfileUpdateParams,
  ProfileUpdateResult,
} from '../types'
import { transformSupabaseError } from './auth-service'

/**
 * 現在のユーザーのプロファイル情報を取得
 * RLS（Row Level Security）により、ログインユーザーは自分の情報のみアクセス可能
 */
export async function getProfile(): Promise<AuthResponse<ProfileResult>> {
  try {
    const supabase = getSupabaseClient()

    // 現在の認証ユーザーを取得
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'ユーザーが認証されていません',
          ...(authError?.message && { details: authError.message }),
        },
      }
    }

    // プロファイル情報を取得（RLSポリシーにより自分の情報のみアクセス可能）
    const { data, error } = await supabase.from('users').select('*').eq('id', user.id).single()

    if (error) {
      if (error.code === 'PGRST116') {
        // レコードが見つからない場合
        return {
          success: false,
          error: {
            code: 'PROFILE_NOT_FOUND',
            message: 'プロファイル情報が見つかりません',
            details: error.message,
          },
        }
      }

      return {
        success: false,
        error: transformProfileError(error),
      }
    }

    // データバリデーション
    const validationResult = validateSupabaseUser(data)
    if (!validationResult.success) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'プロファイル情報の形式が正しくありません',
          details: formatValidationErrors(validationResult.error)
            .map((e) => e.message)
            .join(', '),
        },
      }
    }

    const validatedData = validationResult.data

    // レスポンス形式に変換
    const profileResult: ProfileResult = {
      id: validatedData.id,
      email: validatedData.email,
      role: validatedData.role,
      displayName: validatedData['display_name'],
      phoneNumber: validatedData['phone_number'],
      emailConfirmed: user.email_confirmed_at != null,
      createdAt: validatedData.created_at,
      updatedAt: validatedData.updated_at,
    }

    // 監査ログ記録（成功）
    auditLog('get', user.id, true)

    return {
      success: true,
      data: profileResult,
    }
  } catch (error) {
    const transformedError = transformProfileError(error)

    // エラー時の監査ログ記録
    try {
      const {
        data: { user },
      } = await getSupabaseClient().auth.getUser()
      if (user) {
        auditLog('get', user.id, false, transformedError)
      }
    } catch {
      // 監査ログでのエラーは無視（メイン機能に影響を与えない）
    }

    return {
      success: false,
      error: transformedError,
    }
  }
}

/**
 * プロファイル情報を更新
 * RLS準拠により、ログインユーザーは自分の情報のみ更新可能
 */
export async function updateProfile(
  params: ProfileUpdateParams
): Promise<AuthResponse<ProfileUpdateResult>> {
  try {
    const supabase = getSupabaseClient()

    // パラメータのバリデーション
    const validationResult = validateProfileUpdate(params)
    if (!validationResult.success) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'プロファイル更新パラメータが正しくありません',
          details: formatValidationErrors(validationResult.error)
            .map((e) => e.message)
            .join(', '),
        },
      }
    }

    // 現在の認証ユーザーを取得
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'ユーザーが認証されていません',
          ...(authError?.message && { details: authError.message }),
        },
      }
    }

    // 更新するフィールドが空でない場合のみ更新実行
    const updateData: Record<string, string | null> = {}
    if (params.displayName !== undefined) {
      updateData['display_name'] = params.displayName
    }
    if (params.phoneNumber !== undefined) {
      updateData['phone_number'] = params.phoneNumber
    }

    // 更新するデータがない場合は現在のプロファイルを返す
    if (Object.keys(updateData).length === 0) {
      return await getProfile()
    }

    // プロファイル更新（RLSポリシーにより自分の情報のみ更新可能）
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      return {
        success: false,
        error: transformProfileError(error),
      }
    }

    // データバリデーション
    const validationResultUpdate = validateSupabaseUser(data)
    if (!validationResultUpdate.success) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '更新されたプロファイル情報の形式が正しくありません',
          details: formatValidationErrors(validationResultUpdate.error)
            .map((e) => e.message)
            .join(', '),
        },
      }
    }

    const validatedUpdateData = validationResultUpdate.data

    // レスポンス形式に変換
    const profileUpdateResult: ProfileUpdateResult = {
      id: validatedUpdateData.id,
      email: validatedUpdateData.email,
      role: validatedUpdateData.role,
      displayName: validatedUpdateData['display_name'],
      phoneNumber: validatedUpdateData['phone_number'],
      emailConfirmed: user.email_confirmed_at != null,
      createdAt: validatedUpdateData.created_at,
      updatedAt: validatedUpdateData.updated_at,
    }

    // 監査ログ記録（成功）
    auditLog('update', user.id, true)

    return {
      success: true,
      data: profileUpdateResult,
    }
  } catch (error) {
    const transformedError = transformProfileError(error)

    // エラー時の監査ログ記録
    try {
      const {
        data: { user },
      } = await getSupabaseClient().auth.getUser()
      if (user) {
        auditLog('update', user.id, false, transformedError)
      }
    } catch {
      // 監査ログでのエラーは無視（メイン機能に影響を与えない）
    }

    return {
      success: false,
      error: transformedError,
    }
  }
}

/**
 * プロファイル固有のエラーメッセージ変換（強化版）
 */
function transformProfileError(error: unknown): AuthError {
  const baseError = transformSupabaseError(error)

  // プロファイル関連の特定エラーメッセージでオーバーライド
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const supabaseError = error as { message: string; code?: string; details?: string }

    const profileErrorMessages: Record<string, string> = {
      'Permission denied': 'プロファイル情報へのアクセス権限がありません',
      'Row level security policy violation': 'プロファイル情報の更新権限がありません',
      'duplicate key value violates unique constraint': 'この情報は既に使用されています',
      'value too long': '入力された値が長すぎます',
      'check constraint': 'データの形式が正しくありません',
      'foreign key constraint': '関連するデータが見つかりません',
      'not null constraint': '必須項目が入力されていません',
      'unique constraint': '同じ情報が既に登録されています',
    }

    // PostgreSQLエラーコード別の詳細メッセージ
    const postgresErrorCodes: Record<string, string> = {
      '23505': '同じ情報が既に登録されています（重複エラー）',
      '23503': '関連するデータが存在しません（参照整合性エラー）',
      '23502': '必須項目が入力されていません（NOT NULL制約エラー）',
      '23514': 'データの形式や値が正しくありません（チェック制約エラー）',
      '42501': 'この操作を実行する権限がありません（権限エラー）',
      PGRST301: '認証が必要です。ログインしてください',
      PGRST302: 'この操作を実行する権限がありません',
    }

    // エラーコードによる詳細メッセージ
    if (supabaseError.code && postgresErrorCodes[supabaseError.code]) {
      return {
        ...baseError,
        code: supabaseError.code,
        message: postgresErrorCodes[supabaseError.code] ?? supabaseError.message,
        details: supabaseError.details || supabaseError.message,
      }
    }

    // メッセージによるマッピング
    const profileMessage = profileErrorMessages[supabaseError.message]
    if (profileMessage) {
      return {
        ...baseError,
        message: profileMessage,
      }
    }
  }

  return baseError
}

/**
 * セキュリティ監査ログ出力
 * プロファイル操作の監査ログを記録（開発環境ではコンソール、本番環境では外部ログサービス）
 */
function auditLog(operation: string, userId: string, success: boolean, error?: AuthError): void {
  const auditData = {
    timestamp: new Date().toISOString(),
    operation: `profile.${operation}`,
    userId,
    success,
    error: error ? { code: error.code, message: error.message } : undefined,
    userAgent: typeof window !== 'undefined' ? window.navigator?.userAgent : 'server',
    ipAddress: 'masked', // 実際の実装では適切にIPアドレスを取得・マスク
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('Profile Audit Log:', auditData)
  } else {
    // 本番環境では外部ログサービス（CloudWatch、DataDog等）に送信
    // 実装は環境に応じて適切に設定
  }
}
