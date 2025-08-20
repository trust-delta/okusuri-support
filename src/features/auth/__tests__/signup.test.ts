/**
 * サインアップAPI のテスト
 * Red-Green-Refactor サイクルに従った実装
 */

import { type Mock, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  resendConfirmationEmail,
  signUpWithEmailConfirmation,
  verifyEmailConfirmation,
} from '../api/signup'
import type { SignUpRequest } from '../schemas/signup'

// Supabaseクライアントのモック
const mockSupabaseClient = {
  auth: {
    signUp: vi.fn(),
    resend: vi.fn(),
    verifyOtp: vi.fn(),
  },
  from: vi.fn(() => ({
    upsert: vi.fn(),
    update: vi.fn(() => ({
      eq: vi.fn(),
    })),
  })),
}

vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => mockSupabaseClient,
}))

// window.location のモック
Object.defineProperty(window, 'location', {
  value: {
    origin: 'http://localhost:3000',
  },
  writable: true,
})

describe('signUpWithEmailConfirmation', () => {
  const validSignUpRequest: SignUpRequest = {
    email: 'test@example.com',
    password: 'TestPassword123',
    role: 'patient',
    displayName: 'テストユーザー',
    phoneNumber: '090-1234-5678',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('成功ケース', () => {
    it('メール認証付きサインアップが成功する', async () => {
      // Arrange - 成功レスポンスを設定
      const mockAuthResponse = {
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            email_confirmed_at: null,
          },
        },
        error: null,
      }

      const mockFromChain = {
        upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
      ;(mockSupabaseClient.auth.signUp as Mock).mockResolvedValue(mockAuthResponse)
      mockSupabaseClient.from.mockReturnValue(mockFromChain)

      // Act
      const result = await signUpWithEmailConfirmation(validSignUpRequest)

      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        userId: 'user-123',
        needsEmailConfirmation: true,
        confirmationSentTo: 'test@example.com',
      })

      // Supabase auth.signUp が適切な引数で呼ばれることを確認
      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'TestPassword123',
        options: {
          emailRedirectTo: 'http://localhost:3000/auth/confirm',
          data: {
            role: 'patient',
            display_name: 'テストユーザー',
            phone_number: '090-1234-5678',
          },
        },
      })

      // プロファイル保存が呼ばれることを確認
      expect(mockFromChain.upsert).toHaveBeenCalledWith({
        id: 'user-123',
        email: 'test@example.com',
        role: 'patient',
        display_name: 'テストユーザー',
        phone_number: '090-1234-5678',
        updated_at: expect.any(String),
      })
    })

    it('オプション項目なしでもサインアップが成功する', async () => {
      // Arrange
      const minimalRequest: SignUpRequest = {
        email: 'minimal@example.com',
        password: 'MinimalPass123',
        role: 'supporter',
      }

      const mockAuthResponse = {
        data: {
          user: {
            id: 'user-456',
            email: 'minimal@example.com',
            email_confirmed_at: null,
          },
        },
        error: null,
      }

      const mockFromChain = {
        upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
      ;(mockSupabaseClient.auth.signUp as Mock).mockResolvedValue(mockAuthResponse)
      mockSupabaseClient.from.mockReturnValue(mockFromChain)

      // Act
      const result = await signUpWithEmailConfirmation(minimalRequest)

      // Assert
      expect(result.success).toBe(true)
      expect(mockFromChain.upsert).toHaveBeenCalledWith({
        id: 'user-456',
        email: 'minimal@example.com',
        role: 'supporter',
        display_name: null,
        phone_number: null,
        updated_at: expect.any(String),
      })
    })
  })

  describe('バリデーションエラーケース', () => {
    it('既に登録済みのメールアドレスでエラーが返される', async () => {
      // Arrange
      const mockAuthError = {
        message: 'User already registered',
        status: 400,
      }
      ;(mockSupabaseClient.auth.signUp as Mock).mockResolvedValue({
        data: { user: null },
        error: mockAuthError,
      })

      // Act
      const result = await signUpWithEmailConfirmation(validSignUpRequest)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toEqual({
        code: 'SIGNUP_ERROR',
        message: 'このメールアドレスは既に登録されています',
        details: 'User already registered',
        field: 'email',
      })
    })

    it('パスワードが弱い場合のエラーが返される', async () => {
      // Arrange
      const mockAuthError = {
        message: 'Password is too weak',
        status: 400,
      }
      ;(mockSupabaseClient.auth.signUp as Mock).mockResolvedValue({
        data: { user: null },
        error: mockAuthError,
      })

      // Act
      const result = await signUpWithEmailConfirmation(validSignUpRequest)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toEqual({
        code: 'SIGNUP_ERROR',
        message: 'パスワードが弱すぎます。より強固なパスワードを設定してください',
        details: 'Password is too weak',
        field: 'password',
      })
    })

    it('メール送信制限に達した場合のエラーが返される', async () => {
      // Arrange
      const mockAuthError = {
        message: 'Email rate limit exceeded',
        status: 429,
      }
      ;(mockSupabaseClient.auth.signUp as Mock).mockResolvedValue({
        data: { user: null },
        error: mockAuthError,
      })

      // Act
      const result = await signUpWithEmailConfirmation(validSignUpRequest)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toEqual({
        code: 'SIGNUP_ERROR',
        message: 'メール送信の制限に達しました。しばらく時間をおいて再度お試しください',
        details: 'Email rate limit exceeded',
        field: 'email',
      })
    })
  })

  describe('システムエラーケース', () => {
    it('認証ユーザー作成に失敗した場合', async () => {
      // Arrange
      ;(mockSupabaseClient.auth.signUp as Mock).mockResolvedValue({
        data: { user: null },
        error: null,
      })

      // Act
      const result = await signUpWithEmailConfirmation(validSignUpRequest)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toEqual({
        code: 'SIGNUP_FAILED',
        message: 'ユーザー登録に失敗しました',
      })
    })

    it('予期しないエラーが発生した場合', async () => {
      // Arrange
      ;(mockSupabaseClient.auth.signUp as Mock).mockRejectedValue(
        new Error('Network connection failed')
      )

      // Act
      const result = await signUpWithEmailConfirmation(validSignUpRequest)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('UNKNOWN_ERROR')
      expect(result.error?.message).toBe('エラーが発生しました。再度お試しください。')
      expect(result.error?.details).toBe('Error: Network connection failed')
    })
  })
})

describe('resendConfirmationEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('確認メール再送信が成功する', async () => {
    // Arrange
    ;(mockSupabaseClient.auth.resend as Mock).mockResolvedValue({
      data: {},
      error: null,
    })

    // Act
    const result = await resendConfirmationEmail('test@example.com')

    // Assert
    expect(result.success).toBe(true)
    expect(mockSupabaseClient.auth.resend).toHaveBeenCalledWith({
      type: 'signup',
      email: 'test@example.com',
      options: {
        emailRedirectTo: 'http://localhost:3000/auth/confirm',
      },
    })
  })

  it('メール送信制限エラーが適切に処理される', async () => {
    // Arrange
    ;(mockSupabaseClient.auth.resend as Mock).mockResolvedValue({
      data: null,
      error: { message: 'Email rate limit exceeded' },
    })

    // Act
    const result = await resendConfirmationEmail('test@example.com')

    // Assert
    expect(result.success).toBe(false)
    expect(result.error).toBe(
      'メール送信の制限に達しました。しばらく時間をおいて再度お試しください'
    )
  })
})

describe('verifyEmailConfirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('メール確認が成功する', async () => {
    // Arrange
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    }
    ;(mockSupabaseClient.auth.verifyOtp as Mock).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    const mockUpdateChain = {
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    const mockFromChain = {
      update: vi.fn().mockReturnValue(mockUpdateChain),
    }
    mockSupabaseClient.from.mockReturnValue(mockFromChain)

    // Act
    const result = await verifyEmailConfirmation('token123', 'test@example.com')

    // Assert
    expect(result.success).toBe(true)
    expect(result.userId).toBe('user-123')
    expect(mockSupabaseClient.auth.verifyOtp).toHaveBeenCalledWith({
      token_hash: 'token123',
      type: 'email',
    })

    // プロファイル更新が呼ばれることを確認
    expect(mockFromChain.update).toHaveBeenCalledWith({
      email_confirmed_at: expect.any(String),
      updated_at: expect.any(String),
    })
    expect(mockUpdateChain.eq).toHaveBeenCalledWith('id', 'user-123')
  })

  it('有効期限切れエラーが適切に処理される', async () => {
    // Arrange
    ;(mockSupabaseClient.auth.verifyOtp as Mock).mockResolvedValue({
      data: null,
      error: { message: 'Token expired' },
    })

    // Act
    const result = await verifyEmailConfirmation('expired_token', 'test@example.com')

    // Assert
    expect(result.success).toBe(false)
    expect(result.error).toBe(
      'メール確認リンクの有効期限が切れています。再度確認メールを送信してください'
    )
  })

  it('無効なトークンエラーが適切に処理される', async () => {
    // Arrange
    ;(mockSupabaseClient.auth.verifyOtp as Mock).mockResolvedValue({
      data: null,
      error: { message: 'Invalid token' },
    })

    // Act
    const result = await verifyEmailConfirmation('invalid_token', 'test@example.com')

    // Assert
    expect(result.success).toBe(false)
    expect(result.error).toBe('メール確認リンクが無効です。正しいリンクをクリックしてください')
  })
})
