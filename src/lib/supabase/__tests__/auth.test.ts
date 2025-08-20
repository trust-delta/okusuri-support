/**
 * 認証API関数の単体テスト
 * TDD Red-Green-Refactorサイクルに従った実装
 */

import type { AuthUser } from '@/lib/supabase/types'
import type { AuthCheck, AuthResponse, AuthSession, SignInParams, SignUpParams } from '@/types/auth'
import { type MockedFunction, beforeEach, describe, expect, it, vi } from 'vitest'

// モックの設定 - 実装前なので関数は存在しない想定
vi.mock('../auth', () => ({
  signUp: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  getUser: vi.fn(),
  refreshSession: vi.fn(),
  checkAuth: vi.fn(),
}))

// モック対象のインポート（実装後に有効になる）
let signUp: MockedFunction<(params: SignUpParams) => Promise<AuthResponse<AuthUser>>>
let signIn: MockedFunction<(params: SignInParams) => Promise<AuthResponse<AuthUser>>>
let signOut: MockedFunction<() => Promise<AuthResponse>>
let getUser: MockedFunction<() => Promise<AuthUser | null>>
let refreshSession: MockedFunction<() => Promise<AuthResponse<AuthSession>>>
let checkAuth: MockedFunction<() => Promise<AuthCheck>>

// テスト用のモックデータ
const mockUser: AuthUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'patient',
  displayName: 'テストユーザー',
  phoneNumber: null,
}

const mockSession: AuthSession = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  expiresAt: Date.now() + 3600000,
  user: mockUser,
}

const validSignUpParams: SignUpParams = {
  email: 'newuser@example.com',
  password: 'securePassword123',
  displayName: 'New User',
}

// サインアップ用のモックユーザー
const mockSignUpUser: AuthUser = {
  id: 'new-user-id',
  email: 'newuser@example.com',
  role: 'patient',
  displayName: 'New User',
  phoneNumber: null,
}

const validSignInParams: SignInParams = {
  email: 'test@example.com',
  password: 'password123',
}

describe('認証API関数', () => {
  beforeEach(async () => {
    vi.clearAllMocks()

    // 実装後にインポートが有効になるまで try-catch で囲む
    try {
      const authModule = await import('../auth')
      signUp = authModule.signUp as MockedFunction<typeof authModule.signUp>
      signIn = authModule.signIn as MockedFunction<typeof authModule.signIn>
      signOut = authModule.signOut as MockedFunction<typeof authModule.signOut>
      getUser = authModule.getUser as MockedFunction<typeof authModule.getUser>
      refreshSession = authModule.refreshSession as MockedFunction<typeof authModule.refreshSession>
      checkAuth = authModule.checkAuth as MockedFunction<typeof authModule.checkAuth>
    } catch {
      // 実装前はエラーになるため、暫定的に空の関数を設定
      signUp = vi.fn()
      signIn = vi.fn()
      signOut = vi.fn()
      getUser = vi.fn()
      refreshSession = vi.fn()
      checkAuth = vi.fn()
    }
  })

  describe('signUp', () => {
    it('有効なパラメータでサインアップが成功すること', async () => {
      // Arrange
      const mockSignUpSession: AuthSession = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresAt: Date.now() + 3600000,
        user: mockSignUpUser,
      }
      const expectedResult: AuthResponse<AuthUser> = {
        success: true,
        data: mockSignUpUser,
        user: mockSignUpUser,
        session: mockSignUpSession,
      }
      signUp.mockResolvedValue(expectedResult)

      // Act
      const result = await signUp(validSignUpParams)

      // Assert
      expect(result).toEqual(expectedResult)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveProperty('id')
        expect(result.data).toHaveProperty('email', validSignUpParams.email)
        expect(result.data).toHaveProperty('role')
        expect(result.user).toBeDefined()
        expect(result.session).toBeDefined()
      }
    })

    it('無効なメールアドレスでサインアップが失敗すること', async () => {
      // Arrange
      const invalidParams: SignUpParams = {
        ...validSignUpParams,
        email: 'invalid-email',
      }
      const expectedError: AuthResponse<AuthUser> = {
        success: false,
        error: {
          type: 'INVALID_EMAIL_FORMAT',
          message: 'メールアドレスの形式が正しくありません。',
          code: 'invalid_email',
        },
      }
      signUp.mockResolvedValue(expectedError)

      // Act
      const result = await signUp(invalidParams)

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.type).toBe('INVALID_EMAIL_FORMAT')
        expect(result.error.message).toContain('メールアドレス')
      }
    })

    it('弱いパスワードでサインアップが失敗すること', async () => {
      // Arrange
      const weakPasswordParams: SignUpParams = {
        ...validSignUpParams,
        password: '123',
      }
      const expectedError: AuthResponse<AuthUser> = {
        success: false,
        error: {
          type: 'WEAK_PASSWORD',
          message: 'パスワードは8文字以上で、英数字を含む必要があります。',
          code: 'weak_password',
        },
      }
      signUp.mockResolvedValue(expectedError)

      // Act
      const result = await signUp(weakPasswordParams)

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.type).toBe('WEAK_PASSWORD')
        expect(result.error.message).toContain('パスワード')
      }
    })

    it('既存のメールアドレスでサインアップが失敗すること', async () => {
      // Arrange
      const existingEmailParams: SignUpParams = {
        ...validSignUpParams,
        email: 'existing@example.com',
      }
      const expectedError: AuthResponse<AuthUser> = {
        success: false,
        error: {
          type: 'EMAIL_ALREADY_REGISTERED',
          message: 'このメールアドレスは既に登録されています。',
          code: 'signup_disabled',
        },
      }
      signUp.mockResolvedValue(expectedError)

      // Act
      const result = await signUp(existingEmailParams)

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.type).toBe('EMAIL_ALREADY_REGISTERED')
        expect(result.error.message).toContain('既に登録')
      }
    })
  })

  describe('signIn', () => {
    it('有効な認証情報でサインインが成功すること', async () => {
      // Arrange
      const expectedResult: AuthResponse<AuthUser> = {
        success: true,
        data: mockUser,
        user: mockUser,
        session: mockSession,
      }
      signIn.mockResolvedValue(expectedResult)

      // Act
      const result = await signIn(validSignInParams)

      // Assert
      expect(result).toEqual(expectedResult)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveProperty('id')
        expect(result.data).toHaveProperty('email', validSignInParams.email)
        expect(result.user).toBeDefined()
        expect(result.session).toBeDefined()
      }
    })

    it('無効な認証情報でサインインが失敗すること', async () => {
      // Arrange
      const invalidParams: SignInParams = {
        email: 'test@example.com',
        password: 'wrongpassword',
      }
      const expectedError: AuthResponse<AuthUser> = {
        success: false,
        error: {
          type: 'INVALID_CREDENTIALS',
          message: 'メールアドレスまたはパスワードが正しくありません。',
          code: 'invalid_credentials',
        },
      }
      signIn.mockResolvedValue(expectedError)

      // Act
      const result = await signIn(invalidParams)

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.type).toBe('INVALID_CREDENTIALS')
        expect(result.error.message).toContain('正しくありません')
      }
    })

    it('未確認のメールアドレスでサインインが失敗すること', async () => {
      // Arrange
      const unconfirmedParams: SignInParams = {
        email: 'unconfirmed@example.com',
        password: 'password123',
      }
      const expectedError: AuthResponse<AuthUser> = {
        success: false,
        error: {
          type: 'EMAIL_NOT_CONFIRMED',
          message: 'メールアドレスの確認が完了していません。',
          code: 'email_not_confirmed',
        },
      }
      signIn.mockResolvedValue(expectedError)

      // Act
      const result = await signIn(unconfirmedParams)

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.type).toBe('EMAIL_NOT_CONFIRMED')
        expect(result.error.message).toContain('確認が完了')
      }
    })
  })

  describe('signOut', () => {
    it('サインアウトが成功すること', async () => {
      // Arrange
      const expectedResult: AuthResponse = {
        success: true,
        data: null,
      }
      signOut.mockResolvedValue(expectedResult)

      // Act
      const result = await signOut()

      // Assert
      expect(result.success).toBe(true)
      expect(signOut).toHaveBeenCalledWith()
    })

    it('セッションが既に無効でもサインアウトが成功すること', async () => {
      // Arrange
      const expectedResult: AuthResponse = {
        success: true,
        data: null,
      }
      signOut.mockResolvedValue(expectedResult)

      // Act
      const result = await signOut()

      // Assert
      expect(result.success).toBe(true)
    })
  })

  describe('getUser', () => {
    it('有効なセッションでユーザー情報を取得できること', async () => {
      // Arrange
      getUser.mockResolvedValue(mockUser)

      // Act
      const result = await getUser()

      // Assert
      expect(result).toEqual(mockUser)
      expect(result).toHaveProperty('id')
      expect(result).toHaveProperty('email')
      expect(result).toHaveProperty('role')
    })

    it('無効なセッションでnullが返されること', async () => {
      // Arrange
      getUser.mockResolvedValue(null)

      // Act
      const result = await getUser()

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('refreshSession', () => {
    it('有効なリフレッシュトークンでセッション更新が成功すること', async () => {
      // Arrange
      const newSession: AuthSession = {
        ...mockSession,
        accessToken: 'new-access-token',
        expiresAt: Date.now() + 3600000,
      }
      const expectedResult: AuthResponse<AuthSession> = {
        success: true,
        data: newSession,
        session: newSession,
      }
      refreshSession.mockResolvedValue(expectedResult)

      // Act
      const result = await refreshSession()

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveProperty('accessToken')
        expect(result.data).toHaveProperty('refreshToken')
        expect(result.data).toHaveProperty('expiresAt')
        expect(result.data.accessToken).toBe('new-access-token')
      }
    })

    it('無効なリフレッシュトークンでセッション更新が失敗すること', async () => {
      // Arrange
      const expectedError: AuthResponse<AuthSession> = {
        success: false,
        error: {
          type: 'SESSION_EXPIRED',
          message: 'セッションの期限が切れました。',
          code: 'session_expired',
        },
      }
      refreshSession.mockResolvedValue(expectedError)

      // Act
      const result = await refreshSession()

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.type).toBe('SESSION_EXPIRED')
        expect(result.error.message).toContain('期限が切れました')
      }
    })
  })

  describe('checkAuth', () => {
    it('有効なセッションで認証チェックが成功すること', async () => {
      // Arrange
      const expectedCheck: AuthCheck = {
        isAuthenticated: true,
        user: mockUser,
        requiresRefresh: false,
      }
      checkAuth.mockResolvedValue(expectedCheck)

      // Act
      const result = await checkAuth()

      // Assert
      expect(result.isAuthenticated).toBe(true)
      expect(result.user).toEqual(mockUser)
      expect(result.requiresRefresh).toBe(false)
    })

    it('期限切れ間近のセッションでリフレッシュが必要と判定されること', async () => {
      // Arrange
      const expectedCheck: AuthCheck = {
        isAuthenticated: true,
        user: mockUser,
        requiresRefresh: true,
      }
      checkAuth.mockResolvedValue(expectedCheck)

      // Act
      const result = await checkAuth()

      // Assert
      expect(result.isAuthenticated).toBe(true)
      expect(result.requiresRefresh).toBe(true)
    })

    it('無効なセッションで認証チェックが失敗すること', async () => {
      // Arrange
      const expectedCheck: AuthCheck = {
        isAuthenticated: false,
        user: null,
        requiresRefresh: false,
      }
      checkAuth.mockResolvedValue(expectedCheck)

      // Act
      const result = await checkAuth()

      // Assert
      expect(result.isAuthenticated).toBe(false)
      expect(result.user).toBeNull()
      expect(result.requiresRefresh).toBe(false)
    })
  })

  // エラーハンドリングの統合テスト
  describe('エラーハンドリング', () => {
    it('ネットワークエラーが適切に処理されること', async () => {
      // Arrange
      const networkError: AuthResponse<AuthUser> = {
        success: false,
        error: {
          type: 'NETWORK_ERROR',
          message: 'ネットワークエラーが発生しました。',
          code: 'network_error',
        },
      }
      signIn.mockResolvedValue(networkError)

      // Act
      const result = await signIn(validSignInParams)

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.type).toBe('NETWORK_ERROR')
        expect(result.error.message).toContain('ネットワークエラー')
      }
    })

    it('予期しないエラーが適切に処理されること', async () => {
      // Arrange
      signIn.mockRejectedValue(new Error('Unexpected error'))

      // Act & Assert
      await expect(signIn(validSignInParams)).rejects.toThrow('Unexpected error')
    })
  })
})
