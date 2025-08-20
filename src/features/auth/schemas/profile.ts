/**
 * プロファイル管理 Zodバリデーションスキーマ
 */

import { z } from 'zod'

/**
 * プロファイル更新パラメータのスキーマ（詳細化版）
 */
export const ProfileUpdateSchema = z.object({
  displayName: z
    .string()
    .min(1, '表示名を入力してください')
    .max(50, '表示名は50文字以内で入力してください')
    .regex(
      /^[a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF\s\-_.]+$/,
      '表示名は英数字、ひらがな、カタカナ、漢字、スペース、ハイフン、アンダースコア、ピリオドのみ使用できます'
    )
    .refine(
      (value) => {
        // 先頭・末尾の空白を禁止
        return value === value.trim()
      },
      { message: '表示名の先頭・末尾に空白文字を含めることはできません' }
    )
    .refine(
      (value) => {
        // 連続する空白を禁止
        return !/\s{2,}/.test(value)
      },
      { message: '表示名に連続する空白文字を含めることはできません' }
    )
    .refine(
      (value) => {
        // 不適切な文字列パターンを禁止
        const inappropriatePatterns = [
          /^(admin|administrator|root|system|test|null|undefined|anonymous)$/i,
          /^[\s\-_.]+$/, // 記号のみ
          /^\d+$/, // 数字のみ
        ]
        return !inappropriatePatterns.some((pattern) => pattern.test(value))
      },
      { message: '無効な表示名です。別の名前を入力してください' }
    )
    .optional(),
  phoneNumber: z
    .string()
    .regex(
      /^(0\d{1,4}-\d{1,4}-\d{4}|0\d{9,10}|\+81-\d{1,4}-\d{1,4}-\d{4})$/,
      '正しい電話番号の形式で入力してください（例: 090-1234-5678, 0901234567, +81-90-1234-5678）'
    )
    .refine(
      (value) => {
        // 日本の電話番号の桁数チェック
        const digitsOnly = value.replace(/[^\d]/g, '')
        const japaneseLength = digitsOnly.startsWith('81')
          ? digitsOnly.length === 12
          : digitsOnly.length >= 10 && digitsOnly.length <= 11
        return japaneseLength
      },
      { message: '正しい桁数の電話番号を入力してください' }
    )
    .optional(),
})

/**
 * より厳格なプロファイル更新スキーマ（管理者権限用）
 */
export const AdminProfileUpdateSchema = ProfileUpdateSchema.extend({
  role: z
    .enum(['patient', 'supporter'], {
      errorMap: () => ({ message: '有効なユーザーロールを選択してください' }),
    })
    .optional(),
  isActive: z.boolean().optional(),
})

/**
 * プロファイル更新の部分スキーマ（個別フィールド検証用）
 */
export const DisplayNameSchema = ProfileUpdateSchema.shape.displayName
export const PhoneNumberSchema = ProfileUpdateSchema.shape.phoneNumber

/**
 * プロファイル取得結果のスキーマ
 */
export const ProfileResultSchema = z.object({
  id: z.string().uuid('無効なユーザーIDです'),
  email: z.string().email('無効なメールアドレスです'),
  role: z.enum(['patient', 'supporter'], {
    errorMap: () => ({ message: '無効なユーザーロールです' }),
  }),
  displayName: z.string().nullable(),
  phoneNumber: z.string().nullable(),
  emailConfirmed: z.boolean(),
  createdAt: z.string().datetime('無効な作成日時です'),
  updatedAt: z.string().datetime('無効な更新日時です'),
})

/**
 * Supabaseから取得したユーザー情報を変換するためのスキーマ
 */
export const SupabaseUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: z.enum(['patient', 'supporter']),
  display_name: z.string().nullable(),
  phone_number: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

/**
 * バリデーション関数
 */

/**
 * プロファイル更新パラメータをバリデーション
 */
export function validateProfileUpdate(data: unknown) {
  return ProfileUpdateSchema.safeParse(data)
}

/**
 * プロファイル結果をバリデーション
 */
export function validateProfileResult(data: unknown) {
  return ProfileResultSchema.safeParse(data)
}

/**
 * Supabaseユーザーデータをバリデーション
 */
export function validateSupabaseUser(data: unknown) {
  return SupabaseUserSchema.safeParse(data)
}

/**
 * バリデーションエラーを日本語のエラーメッセージに変換
 */
export function formatValidationErrors(errors: z.ZodError) {
  return errors.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }))
}

/**
 * 型定義エクスポート
 */
export type ProfileUpdateInput = z.infer<typeof ProfileUpdateSchema>
export type ProfileResultOutput = z.infer<typeof ProfileResultSchema>
export type SupabaseUserData = z.infer<typeof SupabaseUserSchema>
