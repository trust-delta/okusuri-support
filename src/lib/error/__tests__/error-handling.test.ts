/**
 * エラーハンドリングのテスト
 * 統一されたエラーハンドリング・ユーザー通知機能のテスト
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AuthError,
  convertSupabaseError,
  getUserMessage,
  handleAuthError,
  isAuthError,
  isRetryableError,
  logAuthError,
} from '../auth-error'

describe('AuthError', () => {
  describe('基本機能', () => {
    it('AuthErrorインスタンスを正しく作成できる', () => {
      const error = new AuthError('INVALID_CREDENTIALS', 'Invalid credentials')

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(AuthError)
      expect(error.name).toBe('AuthError')
      expect(error.type).toBe('INVALID_CREDENTIALS')
      expect(error.message).toBe('Invalid credentials')
      expect(error.statusCode).toBe(401)
      expect(error.isRetryable).toBe(false)
      expect(error.userMessage).toBe('メールアドレスまたはパスワードが正しくありません。')
    })

    it('カスタムオプションを設定できる', () => {
      const error = new AuthError('NETWORK_ERROR', 'Network failed', {
        code: 'NET001',
        userMessage: 'ネットワークに接続できません',
        isRetryable: true,
        statusCode: 503,
      })

      expect(error.code).toBe('NET001')
      expect(error.userMessage).toBe('ネットワークに接続できません')
      expect(error.isRetryable).toBe(true)
      expect(error.statusCode).toBe(503)
    })

    it('cause エラーを正しく設定できる', () => {
      const originalError = new Error('Original error')
      const authError = new AuthError('UNKNOWN_ERROR', 'Unknown error', {
        cause: originalError,
      })

      expect(authError.cause).toBe(originalError)
    })
  })

  describe('デフォルト値の設定', () => {
    it.each([
      ['INVALID_CREDENTIALS', 'メールアドレスまたはパスワードが正しくありません。', false, 401],
      [
        'EMAIL_NOT_CONFIRMED',
        'メールアドレスの確認が完了していません。受信メールを確認してください。',
        false,
        401,
      ],
      ['EMAIL_ALREADY_REGISTERED', 'このメールアドレスは既に登録されています。', false, 409],
      ['WEAK_PASSWORD', 'パスワードは8文字以上で、英数字を含む必要があります。', false, 400],
      ['INVALID_EMAIL_FORMAT', 'メールアドレスの形式が正しくありません。', false, 400],
      ['USER_NOT_FOUND', 'ユーザーが見つかりません。', false, 404],
      ['SESSION_EXPIRED', 'セッションの期限が切れました。再度ログインしてください。', true, 401],
      [
        'NETWORK_ERROR',
        'ネットワークエラーが発生しました。接続を確認して再試行してください。',
        true,
        503,
      ],
      [
        'UNKNOWN_ERROR',
        '予期しないエラーが発生しました。時間をおいて再試行してください。',
        true,
        500,
      ],
    ] as const)(
      'エラータイプ %s のデフォルト値が正しい',
      (type, expectedMessage, expectedRetryable, expectedStatusCode) => {
        const error = new AuthError(type, 'Test message')

        expect(error.userMessage).toBe(expectedMessage)
        expect(error.isRetryable).toBe(expectedRetryable)
        expect(error.statusCode).toBe(expectedStatusCode)
      }
    )
  })

  describe('JSON変換', () => {
    it('toJSON()で適切なオブジェクトを返す', () => {
      const error = new AuthError('INVALID_CREDENTIALS', 'Invalid credentials', {
        code: 'AUTH001',
      })

      const json = error.toJSON()

      expect(json).toEqual({
        name: 'AuthError',
        type: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials',
        userMessage: 'メールアドレスまたはパスワードが正しくありません。',
        code: 'AUTH001',
        isRetryable: false,
        statusCode: 401,
        stack: expect.any(String),
      })
    })

    it('toLogObject()で機密情報を除外したオブジェクトを返す', () => {
      const error = new AuthError(
        'INVALID_CREDENTIALS',
        'Invalid credentials with password: secret123'
      )

      const logObject = error.toLogObject()

      expect(logObject).toEqual({
        name: 'AuthError',
        type: 'INVALID_CREDENTIALS',
        code: '',
        isRetryable: false,
        statusCode: 401,
        timestamp: expect.any(String),
      })
      // メッセージが含まれていないことを確認
      expect(logObject).not.toHaveProperty('message')
    })
  })
})

describe('convertSupabaseError', () => {
  it('Supabaseエラーオブジェクトを正しく変換する', () => {
    const supabaseError = {
      message: 'Invalid login credentials',
      status: 400,
      code: 'invalid_credentials',
    }

    const authError = convertSupabaseError(supabaseError)

    expect(authError).toBeInstanceOf(AuthError)
    expect(authError.type).toBe('INVALID_CREDENTIALS')
    expect(authError.message).toBe('Invalid login credentials')
    expect(authError.code).toBe('invalid_credentials')
    expect(authError.statusCode).toBe(400)
  })

  it('不明なエラーオブジェクトをUNKNOWN_ERRORに変換する', () => {
    const unknownError = { someProperty: 'value' }

    const authError = convertSupabaseError(unknownError)

    expect(authError.type).toBe('UNKNOWN_ERROR')
    expect(authError.message).toBe('Unknown error')
  })

  it('Errorインスタンスを正しく変換する', () => {
    const error = new Error('Some error message')

    const authError = convertSupabaseError(error)

    expect(authError.type).toBe('UNKNOWN_ERROR')
    expect(authError.cause).toBe(error)
  })

  it('プリミティブ値をUNKNOWN_ERRORに変換する', () => {
    const authError = convertSupabaseError('string error')

    expect(authError.type).toBe('UNKNOWN_ERROR')
    expect(authError.message).toBe('Unknown error occurred')
  })
})

describe('エラータイプ判定', () => {
  describe('コードベースの判定', () => {
    it.each([
      ['invalid_credentials', 'INVALID_CREDENTIALS'],
      ['email_not_confirmed', 'EMAIL_NOT_CONFIRMED'],
      ['signup_disabled', 'EMAIL_ALREADY_REGISTERED'],
      ['weak_password', 'WEAK_PASSWORD'],
      ['invalid_email', 'INVALID_EMAIL_FORMAT'],
      ['user_not_found', 'USER_NOT_FOUND'],
      ['session_expired', 'SESSION_EXPIRED'],
    ] as const)('コード %s を正しく判定する', (code, expectedType) => {
      const error = convertSupabaseError({
        message: 'Test message',
        code,
      })

      expect(error.type).toBe(expectedType)
    })
  })

  describe('メッセージベースの判定', () => {
    it.each([
      ['Invalid login credentials', 'INVALID_CREDENTIALS'],
      ['Email not confirmed', 'EMAIL_NOT_CONFIRMED'],
      ['User already registered', 'EMAIL_ALREADY_REGISTERED'],
      ['Password is too weak', 'WEAK_PASSWORD'],
      ['Invalid email format', 'INVALID_EMAIL_FORMAT'],
      ['User not found', 'USER_NOT_FOUND'],
      ['Session has expired', 'SESSION_EXPIRED'],
      ['Network connection failed', 'NETWORK_ERROR'],
    ] as const)('メッセージ "%s" を正しく判定する', (message, expectedType) => {
      const error = convertSupabaseError({ message })

      expect(error.type).toBe(expectedType)
    })
  })

  describe('ステータスコードベースの判定', () => {
    it.each([
      [401, 'INVALID_CREDENTIALS'],
      [404, 'USER_NOT_FOUND'],
      [409, 'EMAIL_ALREADY_REGISTERED'],
      [500, 'NETWORK_ERROR'],
      [503, 'NETWORK_ERROR'],
    ] as const)('ステータス %d を正しく判定する', (status, expectedType) => {
      const error = convertSupabaseError({
        message: 'Test message',
        status,
      })

      expect(error.type).toBe(expectedType)
    })
  })
})

describe('型ガード関数', () => {
  describe('isAuthError', () => {
    it('AuthErrorインスタンスに対してtrueを返す', () => {
      const authError = new AuthError('INVALID_CREDENTIALS', 'Test')

      expect(isAuthError(authError)).toBe(true)
    })

    it('通常のErrorインスタンスに対してfalseを返す', () => {
      const error = new Error('Test')

      expect(isAuthError(error)).toBe(false)
    })

    it('その他の値に対してfalseを返す', () => {
      expect(isAuthError('string')).toBe(false)
      expect(isAuthError(null)).toBe(false)
      expect(isAuthError(undefined)).toBe(false)
      expect(isAuthError({})).toBe(false)
    })
  })

  describe('isRetryableError', () => {
    it('再試行可能なAuthErrorに対してtrueを返す', () => {
      const retryableError = new AuthError('NETWORK_ERROR', 'Network failed')

      expect(isRetryableError(retryableError)).toBe(true)
    })

    it('再試行不可能なAuthErrorに対してfalseを返す', () => {
      const nonRetryableError = new AuthError('INVALID_CREDENTIALS', 'Invalid')

      expect(isRetryableError(nonRetryableError)).toBe(false)
    })

    it('AuthError以外のエラーに対してfalseを返す', () => {
      const error = new Error('Test')

      expect(isRetryableError(error)).toBe(false)
    })
  })
})

describe('ユーザーメッセージ取得', () => {
  it('AuthErrorからユーザーメッセージを取得する', () => {
    const authError = new AuthError('INVALID_CREDENTIALS', 'Test')

    expect(getUserMessage(authError)).toBe('メールアドレスまたはパスワードが正しくありません。')
  })

  it('通常のErrorからデフォルトメッセージを取得する', () => {
    const error = new Error('Test')

    expect(getUserMessage(error)).toBe(
      '予期しないエラーが発生しました。時間をおいて再試行してください。'
    )
  })

  it('その他の値からデフォルトメッセージを取得する', () => {
    expect(getUserMessage('string')).toBe('不明なエラーが発生しました。')
    expect(getUserMessage(null)).toBe('不明なエラーが発生しました。')
  })
})

describe('ログ出力', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('AuthErrorをログ出力する', () => {
    const authError = new AuthError('INVALID_CREDENTIALS', 'Test', { code: 'AUTH001' })

    logAuthError(authError, 'test-context')

    expect(console.error).toHaveBeenCalledWith(
      '[AUTH_ERROR] test-context',
      expect.objectContaining({
        name: 'AuthError',
        type: 'INVALID_CREDENTIALS',
        code: 'AUTH001',
        isRetryable: false,
        statusCode: 401,
        timestamp: expect.any(String),
      })
    )
  })

  it('通常のErrorをログ出力する', () => {
    const error = new Error('Test error')

    logAuthError(error)

    expect(console.error).toHaveBeenCalledWith(
      '[AUTH_ERROR]',
      expect.objectContaining({
        error: 'Test error',
        timestamp: expect.any(String),
      })
    )
  })

  it('コンテキストなしでログ出力する', () => {
    const authError = new AuthError('NETWORK_ERROR', 'Test')

    logAuthError(authError)

    expect(console.error).toHaveBeenCalledWith('[AUTH_ERROR]', expect.any(Object))
  })
})

describe('統一エラーハンドリング', () => {
  it('handleAuthError関数が正常に動作する', async () => {
    const mockOperation = vi.fn().mockResolvedValue('success')
    const result = await handleAuthError(mockOperation)
    expect(result).toBe('success')
  })

  it('try-catch標準化のパターンが動作する', async () => {
    const mockAuthOperation = vi.fn().mockRejectedValue(new Error('Test error'))

    await expect(handleAuthError(mockAuthOperation)).rejects.toThrow(AuthError)
    expect(console.error).toHaveBeenCalled()
  })
})
