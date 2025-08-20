/**
 * useSignInフックのテスト
 * React Hook Testing Libraryを使用した状態管理テスト
 */

import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSignIn } from '../hooks/useSignIn'
import type { SignInFormInput, SignInResult } from '../schemas/signin'

// signin APIのモック
vi.mock('../api/signin', () => ({
  signInWithEmailPassword: vi.fn(),
  signOut: vi.fn(),
}))

import { signInWithEmailPassword, signOut } from '../api/signin'

describe('useSignInフック', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const validFormData: SignInFormInput = {
    email: 'test@example.com',
    password: 'ValidPass123',
    rememberMe: true,
  }

  describe('初期状態', () => {
    it('適切な初期状態を持つこと', () => {
      const { result } = renderHook(() => useSignIn())

      expect(result.current.isLoading).toBe(false)
      expect(result.current.isSuccess).toBe(false)
      expect(result.current.error).toBe(null)
      expect(result.current.result).toBe(null)
    })
  })

  describe('signIn関数', () => {
    it('ログイン成功時に適切な状態更新が行われること', async () => {
      // Arrange: 成功レスポンスのモック
      const mockSuccessResult = {
        success: true,
        data: {
          userId: 'user-123',
          sessionId: 'session-123',
          needsEmailConfirmation: false,
        },
      }

      vi.mocked(signInWithEmailPassword).mockResolvedValue(mockSuccessResult)

      const { result } = renderHook(() => useSignIn())

      // Act: サインイン実行
      let signInResult: SignInResult
      await act(async () => {
        signInResult = await result.current.signIn(validFormData)
      })

      // Assert: 状態とレスポンスの検証
      expect(result.current.isLoading).toBe(false)
      expect(result.current.isSuccess).toBe(true)
      expect(result.current.error).toBe(null)
      expect(result.current.result).toEqual(mockSuccessResult)
      expect(signInResult).toEqual(mockSuccessResult)
    })

    it('ログイン失敗時に適切な状態更新が行われること', async () => {
      // Arrange: エラーレスポンスのモック
      const mockErrorResult = {
        success: false,
        error: {
          code: 'SIGNIN_ERROR',
          message: 'メールアドレスまたはパスワードが正しくありません',
        },
      }

      vi.mocked(signInWithEmailPassword).mockResolvedValue(mockErrorResult)

      const { result } = renderHook(() => useSignIn())

      // Act: サインイン実行
      let signInResult: SignInResult
      await act(async () => {
        signInResult = await result.current.signIn(validFormData)
      })

      // Assert: エラー状態の検証
      expect(result.current.isLoading).toBe(false)
      expect(result.current.isSuccess).toBe(false)
      expect(result.current.error).toBe('メールアドレスまたはパスワードが正しくありません')
      expect(result.current.result).toEqual(mockErrorResult)
      expect(signInResult).toEqual(mockErrorResult)
    })

    it('ログイン処理中のローディング状態が適切に管理されること', async () => {
      // Arrange: 遅延レスポンスのモック
      let resolvePromise: (value: unknown) => void
      const delayedPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })

      vi.mocked(signInWithEmailPassword).mockReturnValue(delayedPromise)

      const { result } = renderHook(() => useSignIn())

      // Act: サインイン開始
      act(() => {
        result.current.signIn(validFormData)
      })

      // Assert: ローディング中の状態確認
      expect(result.current.isLoading).toBe(true)
      expect(result.current.isSuccess).toBe(false)
      expect(result.current.error).toBe(null)

      // Act: プロミス解決
      await act(async () => {
        resolvePromise!({
          success: true,
          data: { userId: 'user-123', sessionId: 'session-123', needsEmailConfirmation: false },
        })
      })

      // Assert: ローディング完了後の状態確認
      expect(result.current.isLoading).toBe(false)
      expect(result.current.isSuccess).toBe(true)
    })

    it('予期しないエラーが発生した場合に適切にハンドリングされること', async () => {
      // Arrange: 例外のモック
      const mockError = new Error('Network error')
      vi.mocked(signInWithEmailPassword).mockRejectedValue(mockError)

      const { result } = renderHook(() => useSignIn())

      // Act: サインイン実行
      await act(async () => {
        await result.current.signIn(validFormData)
      })

      // Assert: エラーハンドリングの検証
      expect(result.current.isLoading).toBe(false)
      expect(result.current.isSuccess).toBe(false)
      expect(result.current.error).toBe('ログイン処理中にエラーが発生しました')
      expect(result.current.result?.success).toBe(false)
    })
  })

  describe('signOut関数', () => {
    it('ログアウト成功時に状態がリセットされること', async () => {
      // Arrange: 初期状態を成功状態にする
      const mockSuccessResult = {
        success: true,
        data: { userId: 'user-123', sessionId: 'session-123', needsEmailConfirmation: false },
      }

      vi.mocked(signInWithEmailPassword).mockResolvedValue(mockSuccessResult)
      vi.mocked(signOut).mockResolvedValue(undefined)

      const { result } = renderHook(() => useSignIn())

      // まずログインして成功状態にする
      await act(async () => {
        await result.current.signIn(validFormData)
      })

      expect(result.current.isSuccess).toBe(true)

      // Act: ログアウト実行
      await act(async () => {
        await result.current.signOut()
      })

      // Assert: 状態がリセットされることを確認
      expect(result.current.isLoading).toBe(false)
      expect(result.current.isSuccess).toBe(false)
      expect(result.current.error).toBe(null)
      expect(result.current.result).toBe(null)
    })

    it('ログアウト失敗時にエラーが設定されること', async () => {
      // Arrange: ログアウトエラーのモック
      vi.mocked(signOut).mockRejectedValue(new Error('Logout failed'))

      const { result } = renderHook(() => useSignIn())

      // Act: ログアウト実行
      await act(async () => {
        await result.current.signOut()
      })

      // Assert: エラー状態の確認
      expect(result.current.error).toBe('ログアウト処理中にエラーが発生しました')
    })
  })

  describe('reset関数', () => {
    it('状態が初期状態にリセットされること', async () => {
      // Arrange: エラー状態にする
      const mockErrorResult = {
        success: false,
        error: { code: 'SIGNIN_ERROR', message: 'Test error' },
      }

      vi.mocked(signInWithEmailPassword).mockResolvedValue(mockErrorResult)

      const { result } = renderHook(() => useSignIn())

      await act(async () => {
        await result.current.signIn(validFormData)
      })

      expect(result.current.error).not.toBe(null)

      // Act: リセット実行
      act(() => {
        result.current.reset()
      })

      // Assert: 初期状態に戻ることを確認
      expect(result.current.isLoading).toBe(false)
      expect(result.current.isSuccess).toBe(false)
      expect(result.current.error).toBe(null)
      expect(result.current.result).toBe(null)
    })
  })
})
