/**
 * サインアップフォームバリデーションスキーマ
 * Zodを使用したフォーム入力の検証
 */

import type { UserRole } from '@/lib/supabase/types'
import { z } from 'zod'

/**
 * サインアップフォームバリデーション規則
 */
export const signUpFormSchema = z
  .object({
    email: z
      .string()
      .min(1, 'メールアドレスを入力してください')
      .email('有効なメールアドレス形式で入力してください')
      .max(320, 'メールアドレスが長すぎます（320文字以内）'),

    password: z
      .string()
      .min(8, 'パスワードは8文字以上で入力してください')
      .max(128, 'パスワードが長すぎます（128文字以内）')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
        'パスワードは英大文字、英小文字、数字をそれぞれ1文字以上含む必要があります'
      ),

    confirmPassword: z.string().min(1, 'パスワード確認を入力してください'),

    role: z.enum(['patient', 'supporter'] as const, {
      errorMap: () => ({ message: '役割（患者または支援者）を選択してください' }),
    }),

    displayName: z
      .string()
      .max(100, '表示名は100文字以内で入力してください')
      .optional()
      .or(z.literal('')),

    phoneNumber: z
      .string()
      .regex(
        /^(\+81-?|0)[1-9]\d{1,4}-?\d{1,4}-?\d{4}$/,
        '有効な電話番号形式で入力してください（例: 090-1234-5678）'
      )
      .optional()
      .or(z.literal('')),

    agreeToTerms: z.boolean().refine((val) => val === true, '利用規約に同意する必要があります'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'パスワードと確認用パスワードが一致しません',
    path: ['confirmPassword'],
  })

/**
 * サインアップフォーム型（Zod推論）
 */
export type SignUpFormInput = z.infer<typeof signUpFormSchema>

/**
 * サインアップリクエスト型（API送信用）
 */
export interface SignUpRequest {
  email: string
  password: string
  role: UserRole
  displayName?: string
  phoneNumber?: string
}

/**
 * サインアップレスポンス型
 */
export interface SignUpResult {
  success: boolean
  data?: {
    userId: string
    needsEmailConfirmation: boolean
    confirmationSentTo: string
  }
  error?: {
    code: string
    message: string
    details?: string
    field?: keyof SignUpRequest
  }
}

/**
 * useSignUpフック戻り値型
 */
export interface UseSignUpReturn {
  // 状態
  isLoading: boolean
  isSuccess: boolean
  error: string | null

  // データ
  result: SignUpResult | null

  // アクション
  signUp: (formData: SignUpFormInput) => Promise<SignUpResult>
  reset: () => void

  // メール確認関連
  resendConfirmation: (email: string) => Promise<boolean>
}

/**
 * フォームデータをAPIリクエストに変換
 */
export function transformToSignUpRequest(formData: SignUpFormInput): SignUpRequest {
  return {
    email: formData.email,
    password: formData.password,
    role: formData.role,
    ...(formData.displayName && { displayName: formData.displayName }),
    ...(formData.phoneNumber && { phoneNumber: formData.phoneNumber }),
  }
}

/**
 * パスワード強度チェック（UIフィードバック用）
 */
export function getPasswordStrength(password: string): {
  score: number // 0-5
  strength: 'very-weak' | 'weak' | 'fair' | 'good' | 'strong'
  feedback: string[]
  color: 'red' | 'orange' | 'yellow' | 'blue' | 'green'
} {
  const feedback: string[] = []
  let score = 0

  // 長さチェック
  if (password.length >= 8) {
    score += 1
  } else {
    feedback.push('8文字以上')
  }

  // 文字種チェック
  if (/[a-z]/.test(password)) {
    score += 1
  } else {
    feedback.push('英小文字を含む')
  }

  if (/[A-Z]/.test(password)) {
    score += 1
  } else {
    feedback.push('英大文字を含む')
  }

  if (/\d/.test(password)) {
    score += 1
  } else {
    feedback.push('数字を含む')
  }

  // 特殊文字チェック（オプション）
  if (/[@$!%*?&]/.test(password)) {
    score += 1
  } else if (score >= 3) {
    feedback.push('特殊文字(@$!%*?&)を含むとより安全')
  }

  // スコア変換
  const strengthMap = {
    0: { strength: 'very-weak' as const, color: 'red' as const },
    1: { strength: 'very-weak' as const, color: 'red' as const },
    2: { strength: 'weak' as const, color: 'orange' as const },
    3: { strength: 'fair' as const, color: 'yellow' as const },
    4: { strength: 'good' as const, color: 'blue' as const },
    5: { strength: 'strong' as const, color: 'green' as const },
  }

  return {
    score,
    ...strengthMap[score as keyof typeof strengthMap],
    feedback,
  }
}

/**
 * パスワードの安全性を最低限チェック
 */
export function isPasswordSecure(password: string): boolean {
  const { score } = getPasswordStrength(password)
  return score >= 4 // goodレベル以上
}

/**
 * 一般的な弱いパスワードリスト（基本的なもののみ）
 */
const WEAK_PASSWORDS = new Set([
  'password',
  '123456789',
  '12345678',
  'qwerty123',
  'password123',
  'admin123',
  'user123',
  'test123',
])

/**
 * 弱いパスワードチェック
 */
export function isWeakPassword(password: string): boolean {
  const lowerPassword = password.toLowerCase()

  // 一般的な弱いパスワード
  if (WEAK_PASSWORDS.has(lowerPassword)) {
    return true
  }

  // 連続する文字（例: 123456, abcdef）
  if (/(.)\1{2,}/.test(password)) {
    return true
  }

  // 辞書攻撃を受けやすいパターン
  if (/^(123|abc|qwe|asd)/i.test(password)) {
    return true
  }

  return false
}
