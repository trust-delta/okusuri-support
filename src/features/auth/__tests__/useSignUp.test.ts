/**
 * useSignUpフック のテスト
 * Red-Green-Refactor サイクルに従った実装
 */

import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getErrorField,
  isSignUpSuccess,
  needsEmailConfirmation,
  useSignUp,
} from '../hooks/useSignUp'
import type { SignUpFormInput, SignUpResult } from '../schemas/signup'

// サインアップAPIのモック
vi.mock('../api/signup', () => ({
  signUpWithEmailConfirmation: vi.fn(),
  resendConfirmationEmail: vi.fn(),
}))

import { resendConfirmationEmail, signUpWithEmailConfirmation } from '../api/signup'

describe('useSignUp', () => {
  const validFormData: SignUpFormInput = {
    email: 'test@example.com',
    password: 'TestPassword123',
    confirmPassword: 'TestPassword123',
    role: 'patient',
    displayName: 'テストユーザー',
    phoneNumber: '090-1234-5678',
    agreeToTerms: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('初期状態', () => {
    it('初期状態が正しく設定される', () => {
      // Act
      const { result } = renderHook(() => useSignUp())

      // Assert
      expect(result.current.isLoading).toBe(false)
      expect(result.current.isSuccess).toBe(false)
      expect(result.current.error).toBe(null)
      expect(result.current.result).toBe(null)
      expect(typeof result.current.signUp).toBe('function')
      expect(typeof result.current.reset).toBe('function')
      expect(typeof result.current.resendConfirmation).toBe('function')
    })
  })

  describe('signUp関数', () => {
    it('サインアップ成功時の状態が正しく更新される', async () => {
      // Arrange
      const mockSuccessResult: SignUpResult = {
        success: true,
        data: {
          userId: 'user-123',
          needsEmailConfirmation: true,
          confirmationSentTo: 'test@example.com',
        },
      }

      vi.mocked(signUpWithEmailConfirmation).mockResolvedValue(mockSuccessResult)

      const { result } = renderHook(() => useSignUp())

      // Act
      let signUpResult: SignUpResult
      await act(async () => {
        signUpResult = await result.current.signUp(validFormData)
      })

      // Assert
      expect(result.current.isLoading).toBe(false)
      expect(result.current.isSuccess).toBe(true)
      expect(result.current.error).toBe(null)
      expect(result.current.result).toEqual(mockSuccessResult)
      expect(signUpResult!).toEqual(mockSuccessResult)

      // API関数が適切な引数で呼ばれることを確認
      expect(signUpWithEmailConfirmation).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'TestPassword123',
        role: 'patient',
        displayName: 'テストユーザー',
        phoneNumber: '090-1234-5678',
      })
    })

    it('サインアップ失敗時の状態が正しく更新される', async () => {
      // Arrange
      const mockErrorResult: SignUpResult = {
        success: false,
        error: {
          code: 'SIGNUP_ERROR',
          message: 'このメールアドレスは既に登録されています',
          field: 'email',
        },
      }

      vi.mocked(signUpWithEmailConfirmation).mockResolvedValue(mockErrorResult)

      const { result } = renderHook(() => useSignUp())

      // Act
      await act(async () => {
        await result.current.signUp(validFormData)
      })

      // Assert
      expect(result.current.isLoading).toBe(false)
      expect(result.current.isSuccess).toBe(false)
      expect(result.current.error).toBe('このメールアドレスは既に登録されています')
      expect(result.current.result).toEqual(mockErrorResult)
    })

    it('サインアップ処理中の状態が正しく管理される', async () => {
      // Arrange
      let resolveSignUp: (value: SignUpResult) => void
      const signUpPromise = new Promise<SignUpResult>((resolve) => {
        resolveSignUp = resolve
      })

      vi.mocked(signUpWithEmailConfirmation).mockReturnValue(signUpPromise)

      const { result } = renderHook(() => useSignUp())

      // Act - サインアップ開始
      act(() => {
        result.current.signUp(validFormData)
      })

      // Assert - ローディング状態を確認
      expect(result.current.isLoading).toBe(true)
      expect(result.current.isSuccess).toBe(false)
      expect(result.current.error).toBe(null)

      // Act - サインアップ完了
      await act(async () => {
        resolveSignUp!({
          success: true,
          data: {
            userId: 'user-123',
            needsEmailConfirmation: true,
            confirmationSentTo: 'test@example.com',
          },
        })
        await signUpPromise
      })

      // Assert - 完了状態を確認
      expect(result.current.isLoading).toBe(false)
      expect(result.current.isSuccess).toBe(true)
    })

    it('オプション項目なしのフォームデータが正しく変換される', async () => {
      // Arrange
      const minimalFormData: SignUpFormInput = {
        email: 'minimal@example.com',
        password: 'MinimalPass123',
        confirmPassword: 'MinimalPass123',
        role: 'supporter',
        displayName: '',
        phoneNumber: '',
        agreeToTerms: true,
      }

      const mockResult: SignUpResult = {
        success: true,
        data: {
          userId: 'user-456',
          needsEmailConfirmation: true,
          confirmationSentTo: 'minimal@example.com',
        },
      }

      vi.mocked(signUpWithEmailConfirmation).mockResolvedValue(mockResult)

      const { result } = renderHook(() => useSignUp())

      // Act
      await act(async () => {
        await result.current.signUp(minimalFormData)
      })

      // Assert
      expect(signUpWithEmailConfirmation).toHaveBeenCalledWith({
        email: 'minimal@example.com',
        password: 'MinimalPass123',
        role: 'supporter',
        displayName: undefined,
        phoneNumber: undefined,
      })
    })

    it('予期しない例外が適切に処理される', async () => {
      // Arrange
      vi.mocked(signUpWithEmailConfirmation).mockRejectedValue(
        new Error('Network connection failed')
      )

      const { result } = renderHook(() => useSignUp())

      // Act
      await act(async () => {
        await result.current.signUp(validFormData)
      })

      // Assert
      expect(result.current.isLoading).toBe(false)
      expect(result.current.isSuccess).toBe(false)
      expect(result.current.error).toBe('サインアップ処理中にエラーが発生しました')
      expect(result.current.result).toEqual({
        success: false,
        error: {
          code: 'SIGNUP_PROCESS_ERROR',
          message: 'サインアップ処理中にエラーが発生しました',
          details: 'Network connection failed',
        },
      })
    })
  })

  describe('resendConfirmation関数', () => {
    it('確認メール再送信が成功する', async () => {
      // Arrange
      vi.mocked(resendConfirmationEmail).mockResolvedValue({
        success: true,
      })

      const { result } = renderHook(() => useSignUp())

      // Act
      let resendResult: boolean
      await act(async () => {
        resendResult = await result.current.resendConfirmation('test@example.com')
      })

      // Assert
      expect(resendResult!).toBe(true)
      expect(result.current.error).toBe(null)
      expect(resendConfirmationEmail).toHaveBeenCalledWith('test@example.com')
    })

    it('確認メール再送信が失敗する', async () => {
      // Arrange
      vi.mocked(resendConfirmationEmail).mockResolvedValue({
        success: false,
        error: 'メール送信の制限に達しました。しばらく時間をおいて再度お試しください',
      })

      const { result } = renderHook(() => useSignUp())

      // Act
      let resendResult: boolean
      await act(async () => {
        resendResult = await result.current.resendConfirmation('test@example.com')
      })

      // Assert
      expect(resendResult!).toBe(false)
      expect(result.current.error).toBe(
        'メール送信の制限に達しました。しばらく時間をおいて再度お試しください'
      )
    })

    it('再送信処理中の例外が適切に処理される', async () => {
      // Arrange
      vi.mocked(resendConfirmationEmail).mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useSignUp())

      // Act
      let resendResult: boolean
      await act(async () => {
        resendResult = await result.current.resendConfirmation('test@example.com')
      })

      // Assert
      expect(resendResult!).toBe(false)
      expect(result.current.error).toBe('確認メール再送信処理中にエラーが発生しました')
    })
  })

  describe('reset関数', () => {
    it('状態がリセットされる', async () => {
      // Arrange - 先にエラー状態を設定
      const mockErrorResult: SignUpResult = {
        success: false,
        error: {
          code: 'SIGNUP_ERROR',
          message: 'テストエラー',
        },
      }

      vi.mocked(signUpWithEmailConfirmation).mockResolvedValue(mockErrorResult)

      const { result } = renderHook(() => useSignUp())

      await act(async () => {
        await result.current.signUp(validFormData)
      })

      // Pre-condition - エラー状態を確認
      expect(result.current.error).toBe('テストエラー')
      expect(result.current.result).toEqual(mockErrorResult)

      // Act - リセット実行
      act(() => {
        result.current.reset()
      })

      // Assert - 初期状態に戻っていることを確認
      expect(result.current.isLoading).toBe(false)
      expect(result.current.isSuccess).toBe(false)
      expect(result.current.error).toBe(null)
      expect(result.current.result).toBe(null)
    })
  })
})

describe('ヘルパー関数', () => {
  describe('isSignUpSuccess', () => {
    it('成功結果でtrueが返される', () => {
      // Arrange
      const successResult: SignUpResult = {
        success: true,
        data: {
          userId: 'user-123',
          needsEmailConfirmation: true,
          confirmationSentTo: 'test@example.com',
        },
      }

      // Act & Assert
      expect(isSignUpSuccess(successResult)).toBe(true)
    })

    it('失敗結果でfalseが返される', () => {
      // Arrange
      const failureResult: SignUpResult = {
        success: false,
        error: {
          code: 'SIGNUP_ERROR',
          message: 'エラー',
        },
      }

      // Act & Assert
      expect(isSignUpSuccess(failureResult)).toBe(false)
    })

    it('nullでfalseが返される', () => {
      // Act & Assert
      expect(isSignUpSuccess(null)).toBe(false)
    })
  })

  describe('needsEmailConfirmation', () => {
    it('メール確認が必要な成功結果でtrueが返される', () => {
      // Arrange
      const result: SignUpResult = {
        success: true,
        data: {
          userId: 'user-123',
          needsEmailConfirmation: true,
          confirmationSentTo: 'test@example.com',
        },
      }

      // Act & Assert
      expect(needsEmailConfirmation(result)).toBe(true)
    })

    it('メール確認が不要な成功結果でfalseが返される', () => {
      // Arrange
      const result: SignUpResult = {
        success: true,
        data: {
          userId: 'user-123',
          needsEmailConfirmation: false,
          confirmationSentTo: 'test@example.com',
        },
      }

      // Act & Assert
      expect(needsEmailConfirmation(result)).toBe(false)
    })

    it('失敗結果でfalseが返される', () => {
      // Arrange
      const result: SignUpResult = {
        success: false,
        error: {
          code: 'SIGNUP_ERROR',
          message: 'エラー',
        },
      }

      // Act & Assert
      expect(needsEmailConfirmation(result)).toBe(false)
    })
  })

  describe('getErrorField', () => {
    it('エラーフィールドが正しく取得される', () => {
      // Arrange
      const result: SignUpResult = {
        success: false,
        error: {
          code: 'SIGNUP_ERROR',
          message: 'メールアドレスエラー',
          field: 'email',
        },
      }

      // Act & Assert
      expect(getErrorField(result)).toBe('email')
    })

    it('成功結果でnullが返される', () => {
      // Arrange
      const result: SignUpResult = {
        success: true,
        data: {
          userId: 'user-123',
          needsEmailConfirmation: true,
          confirmationSentTo: 'test@example.com',
        },
      }

      // Act & Assert
      expect(getErrorField(result)).toBe(null)
    })

    it('フィールドなしエラーでnullが返される', () => {
      // Arrange
      const result: SignUpResult = {
        success: false,
        error: {
          code: 'SIGNUP_ERROR',
          message: 'システムエラー',
        },
      }

      // Act & Assert
      expect(getErrorField(result)).toBe(null)
    })

    it('nullでnullが返される', () => {
      // Act & Assert
      expect(getErrorField(null)).toBe(null)
    })
  })
})
