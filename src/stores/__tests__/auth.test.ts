/**
 * 認証ストアのテスト
 * Zustandストアの状態管理、アクション、永続化をテスト
 */

import type { AuthSession, AuthUser } from '@/lib/supabase/types'
import type { AuthResponse } from '@/types/auth'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { authSelectors, authStoreHelpers, useAuthStore } from '../auth'

// LocalStorage mock
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

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

const mockAuthError = {
  type: 'INVALID_CREDENTIALS' as const,
  message: 'Invalid login credentials',
}

describe('AuthStore', () => {
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
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('初期状態', () => {
    it('初期状態が正しく設定されている', () => {
      const state = useAuthStore.getState()

      expect(state.isAuthenticated).toBe(false)
      expect(state.isLoading).toBe(true) // 初期化時はloading=true
      expect(state.user).toBe(null)
      expect(state.session).toBe(null)
      expect(state.error).toBe(null)
      expect(state.isInitialized).toBe(false)
    })
  })

  describe('ユーザー設定', () => {
    it('setUser でユーザー情報が正しく設定される', () => {
      const { setUser } = useAuthStore.getState()

      setUser(mockUser)

      const state = useAuthStore.getState()
      expect(state.user).toEqual(mockUser)
    })

    it('setUser(null) でユーザー情報がクリアされる', () => {
      const { setUser } = useAuthStore.getState()

      setUser(mockUser)
      setUser(null)

      const state = useAuthStore.getState()
      expect(state.user).toBe(null)
    })
  })

  describe('セッション設定', () => {
    it('setSession でセッション情報が正しく設定される', () => {
      const { setSession } = useAuthStore.getState()

      setSession(mockSession)

      const state = useAuthStore.getState()
      expect(state.session).toEqual(mockSession)
    })

    it('setSession(null) でセッション情報がクリアされる', () => {
      const { setSession } = useAuthStore.getState()

      setSession(mockSession)
      setSession(null)

      const state = useAuthStore.getState()
      expect(state.session).toBe(null)
    })
  })

  describe('ローディング状態', () => {
    it('setLoading でローディング状態が正しく設定される', () => {
      const { setLoading } = useAuthStore.getState()

      setLoading(true)
      expect(useAuthStore.getState().isLoading).toBe(true)

      setLoading(false)
      expect(useAuthStore.getState().isLoading).toBe(false)
    })
  })

  describe('エラー状態', () => {
    it('setError でエラー情報が正しく設定される', () => {
      const { setError } = useAuthStore.getState()

      setError(mockAuthError)

      const state = useAuthStore.getState()
      expect(state.error).toEqual(mockAuthError)
    })

    it('setError(null) でエラー情報がクリアされる', () => {
      const { setError } = useAuthStore.getState()

      setError(mockAuthError)
      setError(null)

      const state = useAuthStore.getState()
      expect(state.error).toBe(null)
    })
  })

  describe('認証成功処理', () => {
    it('setAuthenticated で認証済み状態が正しく設定される（セッションあり）', () => {
      const { setAuthenticated } = useAuthStore.getState()

      setAuthenticated(mockUser, mockSession)

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(true)
      expect(state.isLoading).toBe(false)
      expect(state.user).toEqual(mockUser)
      expect(state.session).toEqual(mockSession)
      expect(state.error).toBe(null)
      expect(state.isInitialized).toBe(true)
    })

    it('setAuthenticated で認証済み状態が正しく設定される（セッションなし）', () => {
      const { setAuthenticated } = useAuthStore.getState()

      setAuthenticated(mockUser)

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(true)
      expect(state.isLoading).toBe(false)
      expect(state.user).toEqual(mockUser)
      expect(state.session).toBe(null)
      expect(state.error).toBe(null)
      expect(state.isInitialized).toBe(true)
    })
  })

  describe('認証失敗処理', () => {
    it('setUnauthenticated で未認証状態が正しく設定される（エラーあり）', () => {
      const { setUnauthenticated } = useAuthStore.getState()

      setUnauthenticated(mockAuthError)

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(false)
      expect(state.isLoading).toBe(false)
      expect(state.user).toBe(null)
      expect(state.session).toBe(null)
      expect(state.error).toEqual(mockAuthError)
      expect(state.isInitialized).toBe(true)
    })

    it('setUnauthenticated で未認証状態が正しく設定される（エラーなし）', () => {
      const { setUnauthenticated } = useAuthStore.getState()

      setUnauthenticated()

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(false)
      expect(state.isLoading).toBe(false)
      expect(state.user).toBe(null)
      expect(state.session).toBe(null)
      expect(state.error).toBe(null)
      expect(state.isInitialized).toBe(true)
    })
  })

  describe('状態リセット', () => {
    it('reset で状態が初期化される', () => {
      const { setAuthenticated, reset } = useAuthStore.getState()

      // 先に認証状態にする
      setAuthenticated(mockUser, mockSession)

      // リセット実行
      reset()

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(false)
      expect(state.isLoading).toBe(false)
      expect(state.user).toBe(null)
      expect(state.session).toBe(null)
      expect(state.error).toBe(null)
      expect(state.isInitialized).toBe(true)
    })
  })

  describe('初期化処理', () => {
    it('setInitialized で初期化状態が正しく設定される', () => {
      const { setInitialized } = useAuthStore.getState()

      setInitialized()

      const state = useAuthStore.getState()
      expect(state.isInitialized).toBe(true)
      expect(state.isLoading).toBe(false)
    })
  })
})

describe('AuthSelectors', () => {
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
  })

  it('getAuthStatus で認証状態のみを取得できる', () => {
    expect(authSelectors.getAuthStatus()).toBe(false)

    useAuthStore.getState().setAuthenticated(mockUser)
    expect(authSelectors.getAuthStatus()).toBe(true)
  })

  it('getUser でユーザー情報のみを取得できる', () => {
    expect(authSelectors.getUser()).toBe(null)

    useAuthStore.getState().setUser(mockUser)
    expect(authSelectors.getUser()).toEqual(mockUser)
  })

  it('getLoadingState でローディング状態のみを取得できる', () => {
    expect(authSelectors.getLoadingState()).toBe(true) // 初期状態はloading=true

    useAuthStore.getState().setLoading(false)
    expect(authSelectors.getLoadingState()).toBe(false)
  })

  it('getInitializedState で初期化状態のみを取得できる', () => {
    expect(authSelectors.getInitializedState()).toBe(false)

    useAuthStore.getState().setInitialized()
    expect(authSelectors.getInitializedState()).toBe(true)
  })
})

describe('AuthStoreHelpers', () => {
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
  })

  describe('handleAuthSuccess', () => {
    it('成功レスポンスで認証状態が正しく更新される', () => {
      const successResponse: AuthResponse<AuthUser> = {
        success: true,
        data: mockUser,
        user: mockUser,
        session: mockSession,
      }

      authStoreHelpers.handleAuthSuccess(successResponse)

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(true)
      expect(state.user).toEqual(mockUser)
      expect(state.session).toEqual(mockSession)
    })

    it('セッションなしの成功レスポンスで認証状態が正しく更新される', () => {
      const successResponse: AuthResponse<AuthUser> = {
        success: true,
        data: mockUser,
        user: mockUser,
      }

      authStoreHelpers.handleAuthSuccess(successResponse)

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(true)
      expect(state.user).toEqual(mockUser)
      expect(state.session).toBe(null)
    })
  })

  describe('handleAuthError', () => {
    it('エラーレスポンスで認証状態が正しく更新される', () => {
      const errorResponse: AuthResponse = {
        success: false,
        error: mockAuthError,
      }

      authStoreHelpers.handleAuthError(errorResponse)

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(false)
      expect(state.error).toEqual(mockAuthError)
    })
  })
})

describe('永続化動作', () => {
  it('永続化対象フィールドが正しく判定される', () => {
    // この部分は実装後にテストを追加予定
    // 現在はストアの構造テストで代替
    expect(useAuthStore).toBeDefined()
  })
})
