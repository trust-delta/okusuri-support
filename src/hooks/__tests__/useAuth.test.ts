/**
 * useAuthフックのテスト
 * 認証フックの動作、状態管理、API連携をテスト
 */

import type { AuthSession, AuthUser } from '@/lib/supabase/types'
import { useAuthStore } from '@/stores/auth'
import type {
  ResetPasswordParams,
  SignInParams,
  SignUpParams,
  UpdatePasswordParams,
  UpdateProfileParams,
} from '@/types/auth'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../useAuth'

// 認証APIをモック
vi.mock('@/lib/supabase/auth', () => ({
  signUp: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  getUser: vi.fn(),
  checkAuth: vi.fn(),
  resetPassword: vi.fn(),
  updatePassword: vi.fn(),
  updateProfile: vi.fn(),
  refreshSession: vi.fn(),
}))

// モック関数の参照を取得
import * as authApi from '@/lib/supabase/auth'
const mockSignUp = vi.mocked(authApi.signUp)
const mockSignIn = vi.mocked(authApi.signIn)
const mockSignOut = vi.mocked(authApi.signOut)
const mockCheckAuth = vi.mocked(authApi.checkAuth)
const mockResetPassword = vi.mocked(authApi.resetPassword)
const mockUpdatePassword = vi.mocked(authApi.updatePassword)
const mockUpdateProfile = vi.mocked(authApi.updateProfile)
const mockRefreshSession = vi.mocked(authApi.refreshSession)

// テスト用のモックデータ
const mockUser: AuthUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'patient',
  displayName: 'Test User',
  phoneNumber: null,
}

const mockSession: AuthSession = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  expiresAt: Date.now() + 3600000,
  user: mockUser,
}

const mockSignInParams: SignInParams = {
  email: 'test@example.com',
  password: 'password123',
}

const mockSignUpParams: SignUpParams = {
  email: 'test@example.com',
  password: 'password123',
  displayName: 'Test User',
}

const mockResetPasswordParams: ResetPasswordParams = {
  email: 'test@example.com',
}

const mockUpdatePasswordParams: UpdatePasswordParams = {
  password: 'newpassword123',
}

const mockUpdateProfileParams: UpdateProfileParams = {
  displayName: 'Updated User',
  phoneNumber: '+1234567890',
}

describe('useAuth', () => {
  beforeEach(() => {
    // ストアの状態のみをリセット（アクションメソッドは保持）
    useAuthStore.setState({
      isAuthenticated: false,
      isLoading: true,
      user: null,
      session: null,
      error: null,
      isInitialized: false,
    })
    vi.clearAllMocks()

    // デフォルトのモック実装
    mockCheckAuth.mockResolvedValue({
      isAuthenticated: false,
      user: null,
      requiresRefresh: false,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('初期状態', () => {
    it('初期状態が正しく返される', () => {
      const { result } = renderHook(() => useAuth())

      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.isLoading).toBe(true) // 初期化中
      expect(result.current.user).toBe(null)
      expect(result.current.session).toBe(null)
      expect(result.current.error).toBe(null)
      expect(result.current.isInitialized).toBe(false)
    })

    it('必要な関数がすべて提供される', () => {
      const { result } = renderHook(() => useAuth())

      expect(typeof result.current.handleSignUp).toBe('function')
      expect(typeof result.current.handleSignIn).toBe('function')
      expect(typeof result.current.handleSignOut).toBe('function')
      expect(typeof result.current.handleResetPassword).toBe('function')
      expect(typeof result.current.handleUpdatePassword).toBe('function')
      expect(typeof result.current.handleUpdateProfile).toBe('function')
      expect(typeof result.current.handleRefreshSession).toBe('function')
      expect(typeof result.current.handleCheckAuth).toBe('function')
      expect(typeof result.current.clearError).toBe('function')
      expect(typeof result.current.resetAuth).toBe('function')
    })
  })

  describe('初期化処理', () => {
    it('未認証の場合、初期化後に未認証状態になる', async () => {
      mockCheckAuth.mockResolvedValue({
        isAuthenticated: false,
        user: null,
        requiresRefresh: false,
      })

      const { result } = renderHook(() => useAuth())

      // 初期化完了まで待機
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.isInitialized).toBe(true)
      expect(mockCheckAuth).toHaveBeenCalledTimes(1)
    })

    it('認証済みの場合、初期化後に認証状態になる', async () => {
      mockCheckAuth.mockResolvedValue({
        isAuthenticated: true,
        user: mockUser,
        requiresRefresh: false,
      })

      const { result } = renderHook(() => useAuth())

      // 初期化完了まで待機
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.isInitialized).toBe(true)
    })

    it('セッション更新が必要な場合、自動で更新される', async () => {
      mockCheckAuth.mockResolvedValue({
        isAuthenticated: true,
        user: mockUser,
        requiresRefresh: true,
      })

      mockRefreshSession.mockResolvedValue({
        success: true,
        data: mockSession,
        session: mockSession,
      })

      const { result } = renderHook(() => useAuth())

      // 初期化完了まで待機
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      expect(mockRefreshSession).toHaveBeenCalledTimes(1)
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.session).toEqual(mockSession)
    })
  })

  describe('サインアップ処理', () => {
    it('成功時に認証状態が更新される', async () => {
      mockSignUp.mockResolvedValue({
        success: true,
        data: mockUser,
        user: mockUser,
        session: mockSession,
      })

      const { result } = renderHook(() => useAuth())

      let response: AuthResponse<AuthUser>
      await act(async () => {
        response = await result.current.handleSignUp(mockSignUpParams)
      })

      expect(mockSignUp).toHaveBeenCalledWith(mockSignUpParams)
      expect(response).toEqual({
        success: true,
        data: mockUser,
        user: mockUser,
        session: mockSession,
      })
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.user).toEqual(mockUser)
    })

    it('失敗時にエラーが設定される', async () => {
      const errorResponse = {
        success: false,
        error: {
          type: 'WEAK_PASSWORD' as const,
          message: 'パスワードが弱すぎます。',
        },
      }

      mockSignUp.mockResolvedValue(errorResponse)

      const { result } = renderHook(() => useAuth())

      let response: AuthResponse<AuthUser>
      await act(async () => {
        response = await result.current.handleSignUp(mockSignUpParams)
      })

      expect(response).toEqual(errorResponse)
      expect(result.current.error).toEqual(errorResponse.error)
      expect(result.current.isAuthenticated).toBe(false)
    })
  })

  describe('サインイン処理', () => {
    it('成功時に認証状態が更新される', async () => {
      mockSignIn.mockResolvedValue({
        success: true,
        data: mockUser,
        user: mockUser,
        session: mockSession,
      })

      const { result } = renderHook(() => useAuth())

      let response: AuthResponse<AuthUser>
      await act(async () => {
        response = await result.current.handleSignIn(mockSignInParams)
      })

      expect(mockSignIn).toHaveBeenCalledWith(mockSignInParams)
      expect(response.success).toBe(true)
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.session).toEqual(mockSession)
    })

    it('失敗時にエラーが設定される', async () => {
      const errorResponse = {
        success: false,
        error: {
          type: 'INVALID_CREDENTIALS' as const,
          message: 'メールアドレスまたはパスワードが間違っています。',
        },
      }

      mockSignIn.mockResolvedValue(errorResponse)

      const { result } = renderHook(() => useAuth())

      let response: AuthResponse<AuthUser>
      await act(async () => {
        response = await result.current.handleSignIn(mockSignInParams)
      })

      expect(response).toEqual(errorResponse)
      expect(result.current.error).toEqual(errorResponse.error)
      expect(result.current.isAuthenticated).toBe(false)
    })
  })

  describe('サインアウト処理', () => {
    it('成功時に状態がリセットされる', async () => {
      mockSignOut.mockResolvedValue({
        success: true,
        data: null,
      })

      const { result } = renderHook(() => useAuth())

      // まず認証状態にする
      act(() => {
        useAuthStore.getState().setAuthenticated(mockUser, mockSession)
      })

      let response: AuthResponse
      await act(async () => {
        response = await result.current.handleSignOut()
      })

      expect(mockSignOut).toHaveBeenCalledTimes(1)
      expect(response).toEqual({
        success: true,
        data: null,
      })
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.user).toBe(null)
      expect(result.current.session).toBe(null)
    })
  })

  describe('パスワードリセット処理', () => {
    it('成功時に適切なレスポンスが返される', async () => {
      mockResetPassword.mockResolvedValue({
        success: true,
        data: null,
      })

      const { result } = renderHook(() => useAuth())

      let response: AuthResponse
      await act(async () => {
        response = await result.current.handleResetPassword(mockResetPasswordParams)
      })

      expect(mockResetPassword).toHaveBeenCalledWith(mockResetPasswordParams)
      expect(response).toEqual({
        success: true,
        data: null,
      })
    })
  })

  describe('パスワード更新処理', () => {
    it('成功時に適切なレスポンスが返される', async () => {
      mockUpdatePassword.mockResolvedValue({
        success: true,
        data: null,
      })

      const { result } = renderHook(() => useAuth())

      let response: AuthResponse
      await act(async () => {
        response = await result.current.handleUpdatePassword(mockUpdatePasswordParams)
      })

      expect(mockUpdatePassword).toHaveBeenCalledWith(mockUpdatePasswordParams)
      expect(response).toEqual({
        success: true,
        data: null,
      })
    })
  })

  describe('プロファイル更新処理', () => {
    it('成功時にユーザー情報が更新される', async () => {
      const updatedUser = {
        ...mockUser,
        displayName: 'Updated User',
        phoneNumber: '+1234567890',
      }

      mockUpdateProfile.mockResolvedValue({
        success: true,
        data: updatedUser,
        user: updatedUser,
      })

      const { result } = renderHook(() => useAuth())

      // セッションを設定
      act(() => {
        useAuthStore.getState().setSession(mockSession)
      })

      let response: AuthResponse<AuthUser>
      await act(async () => {
        response = await result.current.handleUpdateProfile(mockUpdateProfileParams)
      })

      expect(mockUpdateProfile).toHaveBeenCalledWith(mockUpdateProfileParams)
      expect(response.success).toBe(true)
      expect(result.current.user).toEqual(updatedUser)
      expect(result.current.session).toEqual(mockSession)
    })
  })

  describe('ユーティリティ関数', () => {
    it('clearError でエラーがクリアされる', () => {
      const { result } = renderHook(() => useAuth())

      // エラーを設定
      act(() => {
        useAuthStore.getState().setError({
          type: 'UNKNOWN_ERROR',
          message: 'Test error',
        })
      })

      expect(result.current.error).not.toBe(null)

      // エラーをクリア
      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBe(null)
    })

    it('resetAuth で状態がリセットされる', () => {
      const { result } = renderHook(() => useAuth())

      // 認証状態にする
      act(() => {
        useAuthStore.getState().setAuthenticated(mockUser, mockSession)
      })

      expect(result.current.isAuthenticated).toBe(true)

      // リセット実行
      act(() => {
        result.current.resetAuth()
      })

      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.user).toBe(null)
      expect(result.current.session).toBe(null)
    })
  })

  describe('エラーハンドリング', () => {
    it('API呼び出し中の例外がキャッチされる', async () => {
      mockSignIn.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useAuth())

      let response: AuthResponse<AuthUser>
      await act(async () => {
        response = await result.current.handleSignIn(mockSignInParams)
      })

      expect(response.success).toBe(false)
      expect(response.error?.type).toBe('UNKNOWN_ERROR')
      expect(result.current.error?.type).toBe('UNKNOWN_ERROR')
    })
  })
})
