/**
 * 招待コード生成ユーティリティ
 * セキュアな8桁英数字コード生成と重複チェック機能を提供
 */

/**
 * 招待コードの形式
 */
export type InvitationCode = string & { __brand: 'InvitationCode' }

/**
 * コード生成オプション
 */
export interface CodeGenerationOptions {
  /** コードの長さ（デフォルト: 8） */
  length?: number
  /** 使用文字セット（デフォルト: A-Z0-9） */
  charset?: string
  /** 最大再試行回数（デフォルト: 5） */
  maxRetries?: number
}

/**
 * コード生成結果
 */
export interface CodeGenerationResult {
  /** 生成されたコード */
  code: InvitationCode
  /** 試行回数 */
  attempts: number
  /** 生成時刻（UTC） */
  generatedAt: Date
}

/**
 * 重複チェック関数の型定義
 */
export type DuplicateChecker = (code: string) => Promise<boolean>

/**
 * コード生成エラー
 */
export class CodeGenerationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly attempts: number
  ) {
    super(message)
    this.name = 'CodeGenerationError'
  }
}

/**
 * セキュアな8桁英数字招待コード生成
 * @param duplicateChecker 重複チェック関数
 * @param options 生成オプション
 * @returns 生成されたコード情報
 */
export async function generateInvitationCode(
  duplicateChecker: DuplicateChecker,
  options: CodeGenerationOptions = {}
): Promise<CodeGenerationResult> {
  const { length = 8, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', maxRetries = 5 } = options

  let attempts = 0
  const generatedAt = new Date()

  while (attempts < maxRetries) {
    attempts++

    // 暗号学的に安全な乱数でコード生成
    const code = generateSecureCode(length, charset)

    // 重複チェック
    const isDuplicate = await duplicateChecker(code)
    if (!isDuplicate) {
      return {
        code: code as InvitationCode,
        attempts,
        generatedAt,
      }
    }
  }

  throw new CodeGenerationError(
    `招待コード生成に失敗しました（${attempts}回試行）`,
    'GENERATION_FAILED',
    attempts
  )
}

/**
 * 暗号学的に安全なランダムコード生成
 * @param length コード長
 * @param charset 使用文字セット
 * @returns 生成されたコード
 */
function generateSecureCode(length: number, charset: string): string {
  // Node.js環境での暗号学的に安全な乱数生成
  if (typeof window === 'undefined') {
    // Server-side: Node.js crypto
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require('node:crypto')
    const array = new Uint8Array(length)
    crypto.getRandomValues(array)

    return Array.from(array, (byte) => charset[byte % charset.length]).join('')
  }

  // Client-side: Web Crypto API
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)

  return Array.from(array, (byte) => charset[byte % charset.length]).join('')
}

/**
 * 招待コードの妥当性検証
 * @param code 検証するコード
 * @returns 有効な招待コードかどうか
 */
export function validateInvitationCode(code: unknown): code is InvitationCode {
  if (typeof code !== 'string') return false

  // 8桁英数字（A-Z0-9）の正規表現
  const codePattern = /^[A-Z0-9]{8}$/
  return codePattern.test(code)
}

/**
 * 招待コード衝突確率計算
 * @param codeLength コード長
 * @param charsetSize 文字セットサイズ
 * @param existingCodes 既存コード数
 * @returns 衝突確率（0-1）
 */
export function calculateCollisionProbability(
  codeLength: number,
  charsetSize: number,
  existingCodes: number
): number {
  const totalPossibilities = charsetSize ** codeLength

  // 誕生日パラドックス近似
  if (existingCodes === 0) return 0
  if (existingCodes >= totalPossibilities) return 1

  return 1 - Math.exp(-(existingCodes ** 2) / (2 * totalPossibilities))
}

/**
 * デフォルト設定での衝突確率計算結果
 * 8桁英数字（36^8 = 約2.8兆通り）での参考値
 */
export const COLLISION_PROBABILITY_REFERENCE = {
  /** 1000件での衝突確率 */
  at1K: calculateCollisionProbability(8, 36, 1000),
  /** 10万件での衝突確率 */
  at100K: calculateCollisionProbability(8, 36, 100000),
  /** 100万件での衝突確率 */
  at1M: calculateCollisionProbability(8, 36, 1000000),
} as const
