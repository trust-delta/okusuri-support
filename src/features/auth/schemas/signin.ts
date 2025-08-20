/**
 * サインインフォームバリデーションスキーマ
 * Zodを使用したフォーム入力の検証
 */

import { z } from 'zod'

/**
 * サインインフォームバリデーション規則
 */
export const signInFormSchema = z.object({
  email: z
    .string()
    .min(1, 'メールアドレスを入力してください')
    .email('有効なメールアドレス形式で入力してください')
    .max(320, 'メールアドレスが長すぎます（320文字以内）'),

  password: z
    .string()
    .min(1, 'パスワードを入力してください')
    .max(128, 'パスワードが長すぎます（128文字以内）'),

  rememberMe: z.boolean().optional(),
})

/**
 * サインインフォーム型（Zod推論）
 */
export type SignInFormInput = z.infer<typeof signInFormSchema>

/**
 * サインインリクエスト型（API送信用）
 */
export interface SignInRequest {
  email: string
  password: string
  rememberMe?: boolean
}

/**
 * サインインレスポンス型
 */
export interface SignInResult {
  success: boolean
  data?: {
    userId: string
    sessionId: string
    needsEmailConfirmation: boolean
    redirectTo?: string
  }
  error?: {
    code: string
    message: string
    details?: string
    field?: keyof SignInRequest
  }
}

/**
 * useSignInフック戻り値型
 */
export interface UseSignInReturn {
  // 状態
  isLoading: boolean
  isSuccess: boolean
  error: string | null

  // データ
  result: SignInResult | null

  // アクション
  signIn: (formData: SignInFormInput) => Promise<SignInResult>
  signOut: () => Promise<void>
  reset: () => void
}

/**
 * フォームデータをAPIリクエストに変換
 */
export function transformToSignInRequest(formData: SignInFormInput): SignInRequest {
  return {
    email: formData.email,
    password: formData.password,
    ...(formData.rememberMe && { rememberMe: formData.rememberMe }),
  }
}

/**
 * サインインエラーのフィールド特定ヘルパー
 */
export function getSignInErrorField(result: SignInResult | null): string | null {
  if (!result || result.success || !result.error?.field) {
    return null
  }
  return result.error.field
}

/**
 * サインイン成功判定ヘルパー
 */
export function isSignInSuccess(result: SignInResult | null): result is SignInResult & {
  success: true
  data: NonNullable<SignInResult['data']>
} {
  return result?.success === true && result.data != null
}

/**
 * セッション有効性チェック
 */
export function isValidSession(result: SignInResult | null): boolean {
  return isSignInSuccess(result) && !!result.data.sessionId
}
