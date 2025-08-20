/**
 * 認証関連エラーハンドリング
 * 構造化エラー処理とユーザーフレンドリーなエラーメッセージ
 */

import type { AuthErrorType } from '@/types/auth'

/**
 * 基底認証エラークラス
 * Supabaseエラーをアプリケーション固有のエラーに変換
 */
export class AuthError extends Error {
  public readonly type: AuthErrorType
  public readonly code?: string
  public readonly userMessage: string
  public readonly isRetryable: boolean
  public readonly statusCode: number

  constructor(
    type: AuthErrorType,
    message: string,
    options: {
      code?: string
      userMessage?: string
      isRetryable?: boolean
      statusCode?: number
      cause?: Error
    } = {}
  ) {
    super(message)
    this.name = 'AuthError'
    this.type = type
    this.code = options.code || ''
    this.userMessage = options.userMessage ?? this.getDefaultUserMessage(type)
    this.isRetryable = options.isRetryable ?? this.getDefaultRetryability(type)
    this.statusCode = options.statusCode ?? this.getDefaultStatusCode(type)

    if (options.cause) {
      this.cause = options.cause
    }

    // スタックトレースの調整
    Error.captureStackTrace?.(this, AuthError)
  }

  /**
   * デフォルトのユーザーメッセージを取得
   */
  private getDefaultUserMessage(type: AuthErrorType): string {
    const messages: Record<AuthErrorType, string> = {
      INVALID_CREDENTIALS: 'メールアドレスまたはパスワードが正しくありません。',
      EMAIL_NOT_CONFIRMED: 'メールアドレスの確認が完了していません。受信メールを確認してください。',
      EMAIL_ALREADY_REGISTERED: 'このメールアドレスは既に登録されています。',
      WEAK_PASSWORD: 'パスワードは8文字以上で、英数字を含む必要があります。',
      INVALID_EMAIL_FORMAT: 'メールアドレスの形式が正しくありません。',
      USER_NOT_FOUND: 'ユーザーが見つかりません。',
      SESSION_EXPIRED: 'セッションの期限が切れました。再度ログインしてください。',
      NETWORK_ERROR: 'ネットワークエラーが発生しました。接続を確認して再試行してください。',
      UNKNOWN_ERROR: '予期しないエラーが発生しました。時間をおいて再試行してください。',
    }
    return messages[type]
  }

  /**
   * デフォルトの再試行可能性を取得
   */
  private getDefaultRetryability(type: AuthErrorType): boolean {
    const retryableTypes: AuthErrorType[] = ['NETWORK_ERROR', 'SESSION_EXPIRED', 'UNKNOWN_ERROR']
    return retryableTypes.includes(type)
  }

  /**
   * デフォルトのステータスコードを取得
   */
  private getDefaultStatusCode(type: AuthErrorType): number {
    const statusCodes: Record<AuthErrorType, number> = {
      INVALID_CREDENTIALS: 401,
      EMAIL_NOT_CONFIRMED: 401,
      EMAIL_ALREADY_REGISTERED: 409,
      WEAK_PASSWORD: 400,
      INVALID_EMAIL_FORMAT: 400,
      USER_NOT_FOUND: 404,
      SESSION_EXPIRED: 401,
      NETWORK_ERROR: 503,
      UNKNOWN_ERROR: 500,
    }
    return statusCodes[type]
  }

  /**
   * エラー情報をJSON形式で取得
   */
  toJSON() {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      userMessage: this.userMessage,
      code: this.code,
      isRetryable: this.isRetryable,
      statusCode: this.statusCode,
      stack: this.stack,
    }
  }

  /**
   * ログ用の安全なオブジェクトを取得（機密情報除外）
   */
  toLogObject() {
    return {
      name: this.name,
      type: this.type,
      code: this.code,
      isRetryable: this.isRetryable,
      statusCode: this.statusCode,
      // メッセージは機密情報を含む可能性があるため除外
      timestamp: new Date().toISOString(),
    }
  }
}

/**
 * Supabaseエラーを認証エラーに変換する関数
 */
export function convertSupabaseError(error: unknown): AuthError {
  // Supabaseエラーオブジェクトの構造を分析
  if (typeof error === 'object' && error !== null) {
    const supabaseError = error as {
      message?: string
      status?: number
      code?: string
      details?: string
    }

    const message = supabaseError.message || 'Unknown error'
    const code = supabaseError.code
    const status = supabaseError.status

    // Supabaseエラーコードから認証エラータイプを判定
    const type = getAuthErrorType(message, code, status)

    return new AuthError(type, message, {
      ...(code && { code }),
      ...(status && { statusCode: status }),
      ...(error instanceof Error && { cause: error }),
    })
  }

  // 不明なエラー形式
  return new AuthError('UNKNOWN_ERROR', 'Unknown error occurred', {
    ...(error instanceof Error && { cause: error }),
  })
}

/**
 * エラーメッセージ・コード・ステータスから認証エラータイプを判定
 */
function getAuthErrorType(message: string, code?: string, status?: number): AuthErrorType {
  const lowerMessage = message.toLowerCase()

  // コードベースの判定（優先）
  if (code) {
    const codeMap: Record<string, AuthErrorType> = {
      invalid_credentials: 'INVALID_CREDENTIALS',
      email_not_confirmed: 'EMAIL_NOT_CONFIRMED',
      signup_disabled: 'EMAIL_ALREADY_REGISTERED',
      weak_password: 'WEAK_PASSWORD',
      invalid_email: 'INVALID_EMAIL_FORMAT',
      user_not_found: 'USER_NOT_FOUND',
      session_expired: 'SESSION_EXPIRED',
    }

    if (codeMap[code]) {
      return codeMap[code]
    }
  }

  // メッセージベースの判定
  if (
    lowerMessage.includes('invalid') &&
    (lowerMessage.includes('credential') || lowerMessage.includes('login'))
  ) {
    return 'INVALID_CREDENTIALS'
  }
  if (lowerMessage.includes('email') && lowerMessage.includes('confirm')) {
    return 'EMAIL_NOT_CONFIRMED'
  }
  if (lowerMessage.includes('already') && lowerMessage.includes('register')) {
    return 'EMAIL_ALREADY_REGISTERED'
  }
  if (lowerMessage.includes('password') && lowerMessage.includes('weak')) {
    return 'WEAK_PASSWORD'
  }
  if (lowerMessage.includes('email') && lowerMessage.includes('format')) {
    return 'INVALID_EMAIL_FORMAT'
  }
  if (lowerMessage.includes('user') && lowerMessage.includes('not found')) {
    return 'USER_NOT_FOUND'
  }
  if (lowerMessage.includes('session') && lowerMessage.includes('expired')) {
    return 'SESSION_EXPIRED'
  }
  if (lowerMessage.includes('network') || lowerMessage.includes('connection')) {
    return 'NETWORK_ERROR'
  }

  // ステータスコードベースの判定
  if (status) {
    if (status === 401) return 'INVALID_CREDENTIALS'
    if (status === 404) return 'USER_NOT_FOUND'
    if (status === 409) return 'EMAIL_ALREADY_REGISTERED'
    if (status >= 500) return 'NETWORK_ERROR'
  }

  return 'UNKNOWN_ERROR'
}

/**
 * エラーオブジェクトが認証エラーかどうかを判定する型ガード
 */
export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError
}

/**
 * エラーが再試行可能かどうかを判定
 */
export function isRetryableError(error: unknown): boolean {
  return isAuthError(error) ? error.isRetryable : false
}

/**
 * エラーからユーザーメッセージを安全に取得
 */
export function getUserMessage(error: unknown): string {
  if (isAuthError(error)) {
    return error.userMessage
  }
  if (error instanceof Error) {
    return '予期しないエラーが発生しました。時間をおいて再試行してください。'
  }
  return '不明なエラーが発生しました。'
}

/**
 * エラーログ出力用のヘルパー関数
 */
export function logAuthError(error: unknown, context?: string): void {
  const logData = isAuthError(error)
    ? error.toLogObject()
    : { error: String(error), timestamp: new Date().toISOString() }

  console.error(`[AUTH_ERROR]${context ? ` ${context}` : ''}`, logData)
}
