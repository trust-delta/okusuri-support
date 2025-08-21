/**
 * Middleware認証チェックのテスト
 */

import { NextRequest } from 'next/server'
import { type MockedFunction, beforeEach, describe, expect, it, vi } from 'vitest'

// Supabaseクライアントのモック
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

// 実際のmiddleware関数をインポート
import { middleware } from '@/middleware'

describe('Middleware認証チェック', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('未認証ユーザーのアクセス制御', () => {
    it('保護されたページ（/dashboard）へのアクセスでログイン画面にリダイレクトされる', async () => {
      // Arrange
      const request = new NextRequest(new URL('http://localhost:3000/dashboard'))

      // 未認証状態をモック
      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      }

      const { createServerSupabaseClient } = await import('@/lib/supabase/server')
      ;(
        createServerSupabaseClient as MockedFunction<typeof createServerSupabaseClient>
      ).mockResolvedValue(mockSupabaseClient)

      // Act
      const response = await middleware(request)

      // Assert - 307リダイレクトを期待
      expect(response?.status).toBe(307)
      expect(response?.headers.get('location')).toContain('/auth/signin')
      expect(response?.headers.get('location')).toContain('returnTo=%2Fdashboard')
    })

    it('プロファイル画面（/profile）へのアクセスでログイン画面にリダイレクトされる', async () => {
      // Arrange
      const request = new NextRequest(new URL('http://localhost:3000/profile'))

      // 未認証状態をモック
      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      }

      const { createServerSupabaseClient } = await import('@/lib/supabase/server')
      ;(
        createServerSupabaseClient as MockedFunction<typeof createServerSupabaseClient>
      ).mockResolvedValue(mockSupabaseClient)

      // Act
      const response = await middleware(request)

      // Assert - 307リダイレクトを期待
      expect(response?.status).toBe(307)
      expect(response?.headers.get('location')).toContain('/auth/signin')
    })

    it('管理者ページ（/admin）へのアクセスでログイン画面にリダイレクトされる', async () => {
      // Arrange
      const request = new NextRequest(new URL('http://localhost:3000/admin'))

      // 未認証状態をモック
      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      }

      const { createServerSupabaseClient } = await import('@/lib/supabase/server')
      ;(
        createServerSupabaseClient as MockedFunction<typeof createServerSupabaseClient>
      ).mockResolvedValue(mockSupabaseClient)

      // Act
      const response = await middleware(request)

      // Assert - 307リダイレクトを期待
      expect(response?.status).toBe(307)
      expect(response?.headers.get('location')).toContain('/auth/signin')
    })
  })

  describe('認証済みユーザーのアクセス許可', () => {
    it('認証済みユーザーが保護されたページ（/dashboard）に正常にアクセスできる', async () => {
      // Arrange
      const request = new NextRequest(new URL('http://localhost:3000/dashboard'))

      // 認証済み状態をモック
      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'test-user-id',
                email: 'test@example.com',
                email_confirmed_at: '2024-01-01T00:00:00Z',
              },
            },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  role: 'patient',
                },
                error: null,
              }),
            }),
          }),
        }),
      }

      const { createServerSupabaseClient } = await import('@/lib/supabase/server')
      ;(
        createServerSupabaseClient as MockedFunction<typeof createServerSupabaseClient>
      ).mockResolvedValue(mockSupabaseClient)

      // Act
      const response = await middleware(request)

      // Assert - そのまま通す（NextResponse.next()）
      expect(response).toBeDefined()
      expect(response.headers.get('x-middleware-next')).toBe('1')
    })

    it('認証済み患者ユーザーがプロファイル画面にアクセスできる', async () => {
      // Arrange
      const request = new NextRequest(new URL('http://localhost:3000/profile'))

      // 認証済み患者状態をモック
      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'patient-user-id',
                email: 'patient@example.com',
                email_confirmed_at: '2024-01-01T00:00:00Z',
              },
            },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'patient-user-id',
                  email: 'patient@example.com',
                  role: 'patient',
                  display_name: 'Patient User',
                },
                error: null,
              }),
            }),
          }),
        }),
      }

      const { createServerSupabaseClient } = await import('@/lib/supabase/server')
      ;(
        createServerSupabaseClient as MockedFunction<typeof createServerSupabaseClient>
      ).mockResolvedValue(mockSupabaseClient)

      // Act
      const response = await middleware(request)

      // Assert - そのまま通す
      expect(response).toBeDefined()
      expect(response.headers.get('x-middleware-next')).toBe('1')
    })
  })

  describe('無限リダイレクト防止', () => {
    it('未認証ユーザーがログイン画面（/auth/signin）にアクセスした場合はそのまま通す', async () => {
      // Arrange
      const request = new NextRequest(new URL('http://localhost:3000/auth/signin'))

      // 未認証状態をモック
      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      }

      const { createServerSupabaseClient } = await import('@/lib/supabase/server')
      ;(
        createServerSupabaseClient as MockedFunction<typeof createServerSupabaseClient>
      ).mockResolvedValue(mockSupabaseClient)

      // Act
      const response = await middleware(request)

      // Assert - リダイレクトしない
      expect(response).toBeDefined()
      expect(response.headers.get('x-middleware-next')).toBe('1')
    })

    it('未認証ユーザーがサインアップ画面（/auth/signup）にアクセスした場合はそのまま通す', async () => {
      // Arrange
      const request = new NextRequest(new URL('http://localhost:3000/auth/signup'))

      // 未認証状態をモック
      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      }

      const { createServerSupabaseClient } = await import('@/lib/supabase/server')
      ;(
        createServerSupabaseClient as MockedFunction<typeof createServerSupabaseClient>
      ).mockResolvedValue(mockSupabaseClient)

      // Act
      const response = await middleware(request)

      // Assert - リダイレクトしない
      expect(response).toBeDefined()
      expect(response.headers.get('x-middleware-next')).toBe('1')
    })

    it('認証済みユーザーがログイン画面（/auth/signin）にアクセスした場合はダッシュボードにリダイレクトされる', async () => {
      // Arrange
      const request = new NextRequest(new URL('http://localhost:3000/auth/signin'))

      // 認証済み状態をモック
      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'test-user-id',
                email: 'test@example.com',
                email_confirmed_at: '2024-01-01T00:00:00Z',
              },
            },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  role: 'patient',
                },
                error: null,
              }),
            }),
          }),
        }),
      }

      const { createServerSupabaseClient } = await import('@/lib/supabase/server')
      ;(
        createServerSupabaseClient as MockedFunction<typeof createServerSupabaseClient>
      ).mockResolvedValue(mockSupabaseClient)

      // Act
      const response = await middleware(request)

      // Assert - ダッシュボードにリダイレクト
      expect(response?.status).toBe(307)
      expect(response?.headers.get('location')).toBe('http://localhost:3000/dashboard')
    })
  })

  describe('returnToパラメータの処理', () => {
    it('認証済みユーザーがログイン画面にreturnToパラメータ付きでアクセスした場合、returnToにリダイレクトされる', async () => {
      // Arrange
      const request = new NextRequest(
        new URL('http://localhost:3000/auth/signin?returnTo=%2Fprofile')
      )

      // 認証済み状態をモック
      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'test-user-id',
                email: 'test@example.com',
                email_confirmed_at: '2024-01-01T00:00:00Z',
              },
            },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  role: 'patient',
                },
                error: null,
              }),
            }),
          }),
        }),
      }

      const { createServerSupabaseClient } = await import('@/lib/supabase/server')
      ;(
        createServerSupabaseClient as MockedFunction<typeof createServerSupabaseClient>
      ).mockResolvedValue(mockSupabaseClient)

      // Act
      const response = await middleware(request)

      // Assert - returnToで指定されたプロファイル画面にリダイレクト
      expect(response?.status).toBe(307)
      expect(response?.headers.get('location')).toBe('http://localhost:3000/profile')
    })

    it('認証済み患者ユーザーが管理者ページをreturnToに指定してログイン画面にアクセスした場合、ダッシュボードにリダイレクトされる', async () => {
      // Arrange
      const request = new NextRequest(
        new URL('http://localhost:3000/auth/signin?returnTo=%2Fadmin')
      )

      // 認証済み患者状態をモック
      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'patient-user-id',
                email: 'patient@example.com',
                email_confirmed_at: '2024-01-01T00:00:00Z',
              },
            },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  role: 'patient', // 管理者権限なし
                },
                error: null,
              }),
            }),
          }),
        }),
      }

      const { createServerSupabaseClient } = await import('@/lib/supabase/server')
      ;(
        createServerSupabaseClient as MockedFunction<typeof createServerSupabaseClient>
      ).mockResolvedValue(mockSupabaseClient)

      // Act
      const response = await middleware(request)

      // Assert - 権限がないためダッシュボードにリダイレクト
      expect(response?.status).toBe(307)
      expect(response?.headers.get('location')).toBe('http://localhost:3000/dashboard')
    })

    it('外部URLをreturnToに指定した場合は無視され、ダッシュボードにリダイレクトされる', async () => {
      // Arrange
      const request = new NextRequest(
        new URL('http://localhost:3000/auth/signin?returnTo=https%3A%2F%2Fexample.com')
      )

      // 認証済み状態をモック
      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'test-user-id',
                email: 'test@example.com',
                email_confirmed_at: '2024-01-01T00:00:00Z',
              },
            },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  role: 'patient',
                },
                error: null,
              }),
            }),
          }),
        }),
      }

      const { createServerSupabaseClient } = await import('@/lib/supabase/server')
      ;(
        createServerSupabaseClient as MockedFunction<typeof createServerSupabaseClient>
      ).mockResolvedValue(mockSupabaseClient)

      // Act
      const response = await middleware(request)

      // Assert - セキュリティ上、外部URLは無視してダッシュボードにリダイレクト
      expect(response?.status).toBe(307)
      expect(response?.headers.get('location')).toBe('http://localhost:3000/dashboard')
    })
  })

  describe('権限レベルのチェック', () => {
    it('患者ユーザーが管理者ページ（/admin）にアクセスした場合は403エラー', async () => {
      // Arrange
      const request = new NextRequest(new URL('http://localhost:3000/admin'))

      // 認証済み患者状態をモック
      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'patient-user-id',
                email: 'patient@example.com',
                email_confirmed_at: '2024-01-01T00:00:00Z',
              },
            },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  role: 'patient', // 管理者権限なし
                },
                error: null,
              }),
            }),
          }),
        }),
      }

      const { createServerSupabaseClient } = await import('@/lib/supabase/server')
      ;(
        createServerSupabaseClient as MockedFunction<typeof createServerSupabaseClient>
      ).mockResolvedValue(mockSupabaseClient)

      // Act
      const response = await middleware(request)

      // Assert - 403エラー
      expect(response?.status).toBe(403)
    })

    it('管理者ユーザーが管理者ページ（/admin）に正常にアクセスできる', async () => {
      // Arrange
      const request = new NextRequest(new URL('http://localhost:3000/admin'))

      // 認証済み管理者状態をモック
      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'admin-user-id',
                email: 'admin@example.com',
                email_confirmed_at: '2024-01-01T00:00:00Z',
              },
            },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  role: 'admin', // 管理者権限あり
                },
                error: null,
              }),
            }),
          }),
        }),
      }

      const { createServerSupabaseClient } = await import('@/lib/supabase/server')
      ;(
        createServerSupabaseClient as MockedFunction<typeof createServerSupabaseClient>
      ).mockResolvedValue(mockSupabaseClient)

      // Act
      const response = await middleware(request)

      // Assert - そのまま通す
      expect(response).toBeDefined()
      expect(response.headers.get('x-middleware-next')).toBe('1')
    })
  })

  describe('APIルートと静的ファイルの除外', () => {
    it('APIルート（/api/*）はMiddlewareの対象外', async () => {
      // Arrange
      const request = new NextRequest(new URL('http://localhost:3000/api/auth/signin'))

      // Act
      const response = await middleware(request)

      // Assert - 処理しない
      expect(response).toBeDefined()
      expect(response.headers.get('x-middleware-next')).toBe('1')
    })

    it('静的ファイル（/_next/*）はMiddlewareの対象外', async () => {
      // Arrange
      const request = new NextRequest(new URL('http://localhost:3000/_next/static/css/app.css'))

      // Act
      const response = await middleware(request)

      // Assert - 処理しない
      expect(response).toBeDefined()
      expect(response.headers.get('x-middleware-next')).toBe('1')
    })

    it('画像ファイル（favicon.ico）はMiddlewareの対象外', async () => {
      // Arrange
      const request = new NextRequest(new URL('http://localhost:3000/favicon.ico'))

      // Act
      const response = await middleware(request)

      // Assert - 処理しない
      expect(response).toBeDefined()
      expect(response.headers.get('x-middleware-next')).toBe('1')
    })
  })
})

/**
 * Middleware設定のテスト
 */
describe('Middleware設定', () => {
  it('matcher設定が適切に定義されている', async () => {
    // 実際のmiddleware configをインポート
    const { config } = await import('@/middleware')

    // Act & Assert - 設定が適切に定義されている
    expect(config.matcher).toBeDefined()
    expect(Array.isArray(config.matcher)).toBe(true)
    expect(config.matcher.length).toBeGreaterThan(0)

    // パターンが適切に除外設定されている
    const pattern = config.matcher[0] as string
    expect(pattern).toContain('api')
    expect(pattern).toContain('_next')
    expect(pattern).toContain('favicon.ico')
  })
})
