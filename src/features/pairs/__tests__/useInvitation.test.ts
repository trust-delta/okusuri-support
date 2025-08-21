/**
 * useInvitation カスタムフック テスト
 * TDDプロセス: Red-Green-Refactor
 */

import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  useInvitationCreate,
  useInvitationFind,
  useInvitationList,
  useInvitationManager,
  useInvitationResponse,
} from '../hooks/useInvitation'
import type {
  CreateInvitationParams,
  FindInvitationParams,
  RespondToInvitationParams,
} from '../types/invitation'

// モック設定
vi.mock('../api/invitation')

// テスト用のモックデータ
const mockCreateResult = {
  invitation: {
    id: 'invitation-123',
    inviterId: 'user-123',
    inviteeEmail: 'supporter@example.com',
    targetRole: 'supporter' as const,
    invitationCode: 'ABC12345' as never,
    status: 'pending' as const,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
    message: null,
  },
  invitationUrl: 'http://localhost:3000/invitation?code=ABC12345',
  qrCodeData: 'invitation:ABC12345:supporter@example.com',
}

const mockFindResult = {
  id: 'invitation-123',
  inviterId: 'user-456',
  inviteeEmail: 'supporter@example.com',
  targetRole: 'supporter' as const,
  invitationCode: 'ABC12345' as never,
  status: 'pending' as const,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  createdAt: new Date(),
  updatedAt: new Date(),
  message: 'よろしくお願いします',
  inviter: {
    id: 'user-456',
    name: 'Inviter User',
    email: 'inviter@example.com',
    role: 'patient' as const,
  },
  isExpired: false,
  isResponded: false,
  isValid: true,
  timeToExpiry: 6 * 24 * 60 * 60, // 6日間の秒数
}

beforeEach(async () => {
  // モックAPIの設定
  const invitationApi = await import('../api/invitation')
  vi.mocked(invitationApi.createInvitation).mockResolvedValue(mockCreateResult)
  vi.mocked(invitationApi.findByCode).mockResolvedValue(mockFindResult)
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('useInvitation hooks', () => {
  describe('useInvitationCreate', () => {
    test('招待作成が正常に動作する', async () => {
      const { result } = renderHook(() => useInvitationCreate())

      // 初期状態の確認
      expect(result.current.isCreating).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.lastCreated).toBeNull()

      const params: CreateInvitationParams = {
        inviterId: 'user-123',
        inviteeEmail: 'supporter@example.com',
        targetRole: 'supporter',
        message: 'よろしくお願いします',
      }

      let invitationResult: typeof mockCreateResult | null = null

      // 招待作成実行
      await act(async () => {
        invitationResult = await result.current.createInvitation(params)
      })

      // 結果の確認
      expect(invitationResult).toEqual(mockCreateResult)
      expect(result.current.isCreating).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.lastCreated).toEqual(mockCreateResult)
    })

    test('招待作成中はローディング状態になる', async () => {
      const { result } = renderHook(() => useInvitationCreate())

      const params: CreateInvitationParams = {
        inviterId: 'user-123',
        inviteeEmail: 'supporter@example.com',
        targetRole: 'supporter',
      }

      // 招待作成開始
      act(() => {
        result.current.createInvitation(params)
      })

      // ローディング状態の確認
      expect(result.current.isCreating).toBe(true)

      // 完了まで待機
      await waitFor(() => {
        expect(result.current.isCreating).toBe(false)
      })
    })

    test('招待作成エラー時はエラー状態になる', async () => {
      const invitationApi = await import('../api/invitation')
      vi.mocked(invitationApi.createInvitation).mockRejectedValueOnce(new Error('Creation failed'))

      const { result } = renderHook(() => useInvitationCreate())

      const params: CreateInvitationParams = {
        inviterId: 'user-123',
        inviteeEmail: 'supporter@example.com',
        targetRole: 'supporter',
      }

      let invitationResult: typeof mockCreateResult | null = null

      await act(async () => {
        invitationResult = await result.current.createInvitation(params)
      })

      expect(invitationResult).toBeNull()
      expect(result.current.error).toBeDefined()
      expect(result.current.error?.code).toBe('GENERATION_FAILED')
      expect(result.current.error?.message).toBe('Creation failed')
      expect(result.current.isCreating).toBe(false)
    })

    test('エラークリア機能が動作する', async () => {
      const invitationApi = await import('../api/invitation')
      vi.mocked(invitationApi.createInvitation).mockRejectedValueOnce(new Error('Creation failed'))

      const { result } = renderHook(() => useInvitationCreate())

      // エラーを発生させる
      await act(async () => {
        await result.current.createInvitation({
          inviterId: 'user-123',
          inviteeEmail: 'supporter@example.com',
          targetRole: 'supporter',
        })
      })

      expect(result.current.error).toBeDefined()

      // エラーをクリア
      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('useInvitationFind', () => {
    test('招待検索が正常に動作する', async () => {
      const { result } = renderHook(() => useInvitationFind())

      // 初期状態の確認
      expect(result.current.isSearching).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.foundInvitation).toBeNull()

      const params: FindInvitationParams = {
        code: 'ABC12345' as never,
      }

      let searchResult: typeof mockFindResult | null = null

      // 招待検索実行
      await act(async () => {
        searchResult = await result.current.findInvitation(params)
      })

      // 結果の確認
      expect(searchResult).toEqual(mockFindResult)
      expect(result.current.isSearching).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.foundInvitation).toEqual(mockFindResult)
    })

    test('招待検索中はローディング状態になる', async () => {
      const { result } = renderHook(() => useInvitationFind())

      const params: FindInvitationParams = {
        code: 'ABC12345' as never,
      }

      // 招待検索開始
      act(() => {
        result.current.findInvitation(params)
      })

      // ローディング状態の確認
      expect(result.current.isSearching).toBe(true)

      // 完了まで待機
      await waitFor(() => {
        expect(result.current.isSearching).toBe(false)
      })
    })

    test('招待検索エラー時はエラー状態になる', async () => {
      const invitationApi = await import('../api/invitation')
      vi.mocked(invitationApi.findByCode).mockRejectedValueOnce(new Error('Search failed'))

      const { result } = renderHook(() => useInvitationFind())

      const params: FindInvitationParams = {
        code: 'ABC12345' as never,
      }

      let searchResult: typeof mockFindResult | null = null

      await act(async () => {
        searchResult = await result.current.findInvitation(params)
      })

      expect(searchResult).toBeNull()
      expect(result.current.error).toBeDefined()
      expect(result.current.error?.code).toBe('INVITATION_NOT_FOUND')
      expect(result.current.error?.message).toBe('Search failed')
      expect(result.current.isSearching).toBe(false)
    })

    test('検索結果クリア機能が動作する', async () => {
      const { result } = renderHook(() => useInvitationFind())

      // 検索実行
      await act(async () => {
        await result.current.findInvitation({ code: 'ABC12345' as never })
      })

      expect(result.current.foundInvitation).toBeDefined()

      // 結果をクリア
      act(() => {
        result.current.clearResult()
      })

      expect(result.current.foundInvitation).toBeNull()
    })
  })

  describe('useInvitationResponse', () => {
    test('招待応答（プレースホルダー）が動作する', async () => {
      const { result } = renderHook(() => useInvitationResponse())

      // 初期状態の確認
      expect(result.current.isResponding).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.responseResult).toBeNull()

      const params: RespondToInvitationParams = {
        invitationCode: 'ABC12345' as never,
        action: 'accept',
        inviteeEmail: 'supporter@example.com',
      }

      let responseResult: unknown = null

      // 招待応答実行
      await act(async () => {
        responseResult = await result.current.respondToInvitation(params)
      })

      // プレースホルダー実装の確認
      expect(responseResult).toBeDefined()
      expect(result.current.isResponding).toBe(false)
      expect(result.current.responseResult).toBeDefined()
      expect(result.current.responseResult?.success).toBe(true)
    })
  })

  describe('useInvitationList', () => {
    test('招待一覧（プレースホルダー）が動作する', async () => {
      const { result } = renderHook(() => useInvitationList())

      // 初期状態の確認
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.invitations).toBeNull()

      // 招待一覧更新実行
      await act(async () => {
        await result.current.refreshInvitations()
      })

      // プレースホルダー実装の確認
      expect(result.current.isLoading).toBe(false)
      expect(result.current.invitations).toBeDefined()
      expect(result.current.invitations?.totalCount).toBe(0)
      expect(result.current.invitations?.invitations).toEqual([])
    })

    test('フィルター更新機能が動作する', async () => {
      const { result } = renderHook(() => useInvitationList())

      const filter = { status: ['pending' as const] }

      await act(async () => {
        result.current.updateFilter(filter)
      })

      expect(result.current.currentFilter).toEqual(filter)
    })
  })

  describe('useInvitationManager', () => {
    test('統合管理フックが各フックを統合している', () => {
      const { result } = renderHook(() => useInvitationManager())

      // 各フックの統合確認
      expect(result.current.create).toBeDefined()
      expect(result.current.find).toBeDefined()
      expect(result.current.respond).toBeDefined()
      expect(result.current.list).toBeDefined()
      expect(result.current.refreshAll).toBeDefined()
      expect(result.current.clearAllErrors).toBeDefined()
    })

    test('全エラークリア機能が動作する', async () => {
      const { result } = renderHook(() => useInvitationManager())

      // 各フックでエラーを発生させる（モック）
      const invitationApi = await import('../api/invitation')
      vi.mocked(invitationApi.createInvitation).mockRejectedValueOnce(new Error('Create error'))
      vi.mocked(invitationApi.findByCode).mockRejectedValueOnce(new Error('Find error'))

      // エラーを発生させる
      await act(async () => {
        await result.current.create.createInvitation({
          inviterId: 'user-123',
          inviteeEmail: 'supporter@example.com',
          targetRole: 'supporter',
        })
      })

      await act(async () => {
        await result.current.find.findInvitation({ code: 'ABC12345' as never })
      })

      // エラーが設定されていることを確認
      expect(result.current.create.error).toBeDefined()
      expect(result.current.find.error).toBeDefined()

      // 全エラークリア実行
      act(() => {
        result.current.clearAllErrors()
      })

      // 全エラーがクリアされていることを確認
      expect(result.current.create.error).toBeNull()
      expect(result.current.find.error).toBeNull()
    })
  })
})
