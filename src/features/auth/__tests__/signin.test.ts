/**
 * サインインAPI関数のテスト
 * Red-Green-Refactor パターンでテストファースト実装
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { signInWithEmailPassword, signOut } from '../api/signin'
import { transformToSignInRequest } from '../schemas/signin'
import type { SignInFormInput } from '../schemas/signin'

// Supabaseクライアントのモック
const mockSupabaseClient = {
  auth: {
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
      })),
    })),
  })),
}

vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => mockSupabaseClient,
}))

describe('サインインAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('signInWithEmailPassword', () => {
    const validSignInData: SignInFormInput = {
      email: 'test@example.com',
      password: 'ValidPass123',
      rememberMe: true,
    }

    it('有効な認証情報でログイン成功すること', async () => {
      // Arrange: モックの設定
      const mockAuthData = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          email_confirmed_at: new Date().toISOString(),
        },
        session: {
          access_token: 'access_token_123',
          refresh_token: 'refresh_token_123',
        },
      }

      const mockUserProfile = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'patient',
        display_name: 'テストユーザー',
        phone_number: null,
      }

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: mockAuthData,
        error: null,
      })

      const mockSelectChain = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: mockUserProfile,
              error: null,
            }),
          })),
        })),
      }
      mockSupabaseClient.from.mockReturnValue(mockSelectChain)

      // Act: API実行
      const request = transformToSignInRequest(validSignInData)
      const result = await signInWithEmailPassword(request)

      // Assert: 成功結果の検証
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.userId).toBe('user-123')
      expect(result.data?.sessionId).toBe('access_token_123')
      expect(result.data?.needsEmailConfirmation).toBe(false)
      expect(result.error).toBeUndefined()

      // Supabase呼び出しの検証
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'ValidPass123',
      })
    })

    it('無効な認証情報でログイン失敗すること', async () => {
      // Arrange: 認証エラーのモック
      const mockAuthError = {
        message: 'Invalid login credentials',
        status: 400,
      }

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: mockAuthError,
      })

      const invalidData: SignInFormInput = {
        email: 'test@example.com',
        password: 'wrongpassword',
      }

      // Act: API実行
      const request = transformToSignInRequest(invalidData)
      const result = await signInWithEmailPassword(request)

      // Assert: エラー結果の検証
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error?.code).toBe('SIGNIN_ERROR')
      expect(result.error?.message).toBe('メールアドレスまたはパスワードが正しくありません')
      expect(result.data).toBeUndefined()
    })

    it('未確認メールアドレスでログイン時にメール確認フラグが立つこと', async () => {
      // Arrange: 未確認メールユーザーのモック
      const mockAuthData = {
        user: {
          id: 'user-123',
          email: 'unconfirmed@example.com',
          email_confirmed_at: null, // 未確認
        },
        session: {
          access_token: 'access_token_123',
          refresh_token: 'refresh_token_123',
        },
      }

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: mockAuthData,
        error: null,
      })

      const mockSelectChain2 = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'user-123',
                email: 'unconfirmed@example.com',
                role: 'patient',
                display_name: null,
                phone_number: null,
              },
              error: null,
            }),
          })),
        })),
      }
      mockSupabaseClient.from.mockReturnValue(mockSelectChain2)

      // Act: API実行
      const request = transformToSignInRequest(validSignInData)
      const result = await signInWithEmailPassword(request)

      // Assert: メール確認必要フラグの検証
      expect(result.success).toBe(true)
      expect(result.data?.needsEmailConfirmation).toBe(true)
    })

    it('ネットワークエラー時にエラーハンドリングが働くこと', async () => {
      // Arrange: ネットワークエラーのモック
      mockSupabaseClient.auth.signInWithPassword.mockRejectedValue(new Error('Network error'))

      // Act: API実行
      const request = transformToSignInRequest(validSignInData)
      const result = await signInWithEmailPassword(request)

      // Assert: エラー結果の検証
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error?.code).toBe('UNKNOWN_ERROR')
      expect(result.error?.message).toBe(
        'ログイン処理中にエラーが発生しました。再度お試しください。'
      )
    })
  })

  describe('signOut', () => {
    it('ログアウト成功すること', async () => {
      // Arrange: ログアウト成功のモック
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: null,
      })

      // Act: ログアウト実行
      await signOut()

      // Assert: Supabase呼び出しの検証
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalledWith()
    })

    it('ログアウトエラー時に例外が投げられること', async () => {
      // Arrange: ログアウトエラーのモック
      const mockError = {
        message: 'Signout error',
      }

      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: mockError,
      })

      // Act & Assert: エラーが投げられることを確認
      await expect(signOut()).rejects.toThrow('ログアウトに失敗しました: Signout error')
    })
  })

  describe('セッション復元機能', () => {
    it('有効なセッションが存在する場合に復元されること', async () => {
      // このテストは将来のセッション復元機能実装時に追加予定
      expect(true).toBe(true) // プレースホルダー
    })
  })
})
