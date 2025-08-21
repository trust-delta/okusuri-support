/**
 * ペア状態管理ストアのテスト
 */

import type { PairError, UserPair } from '@/features/pairs/types'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Supabase関連のモック（先にモックしてからインポート）
vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: vi.fn(),
  createServerSupabaseClient: vi.fn(),
}))

vi.mock('@/lib/supabase/config', () => ({
  supabaseConfig: {
    url: 'https://test.supabase.co',
    anonKey: 'test-anon-key',
  },
}))

// モック設定
vi.mock('@/features/pairs/api/pair-service')
vi.mock('@/stores/auth', () => ({
  useAuthStore: {
    getState: vi.fn(() => ({
      user: { id: 'user-123', email: 'test@example.com', role: 'patient' },
      isAuthenticated: true,
      isInitialized: true,
    })),
  },
}))

import * as pairService from '@/features/pairs/api/pair-service'
// モック後にインポート
import { pairSelectors, pairStoreHelpers, usePairStore } from '../pairs'

describe('usePairStore', () => {
  const mockPair: UserPair = {
    id: 'pair-123',
    patientId: 'user-123',
    supporterId: 'user-456',
    patientName: '患者太郎',
    supporterName: '支援者花子',
    status: 'approved',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  }

  beforeEach(() => {
    // ストアをリセット
    usePairStore.setState({
      currentPair: null,
      pairPartner: null,
      isLoading: true,
      error: null,
      hasPair: false,
      isInitialized: false,
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('初期状態', () => {
    it('初期状態が正しく設定されている', () => {
      const state = usePairStore.getState()

      expect(state.currentPair).toBeNull()
      expect(state.pairPartner).toBeNull()
      expect(state.isLoading).toBe(true)
      expect(state.error).toBeNull()
      expect(state.hasPair).toBe(false)
      expect(state.isInitialized).toBe(false)
    })
  })

  describe('setPair', () => {
    it('ペア情報を設定できる', () => {
      const { result } = renderHook(() => usePairStore())

      act(() => {
        result.current.setPair(mockPair)
      })

      expect(result.current.currentPair).toEqual(mockPair)
    })

    it('nullを設定できる', () => {
      const { result } = renderHook(() => usePairStore())

      act(() => {
        result.current.setPair(mockPair)
        result.current.setPair(null)
      })

      expect(result.current.currentPair).toBeNull()
    })
  })

  describe('setPairActive', () => {
    it('ペア情報とパートナー情報を正しく設定できる（患者視点）', () => {
      const { result } = renderHook(() => usePairStore())

      act(() => {
        result.current.setPairActive(mockPair, 'user-123')
      })

      expect(result.current.currentPair).toEqual(mockPair)
      expect(result.current.pairPartner).toEqual({
        id: 'user-456',
        name: '支援者花子',
        role: 'supporter',
      })
      expect(result.current.hasPair).toBe(true)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.isInitialized).toBe(true)
    })

    it('ペア情報とパートナー情報を正しく設定できる（支援者視点）', () => {
      const { result } = renderHook(() => usePairStore())

      act(() => {
        result.current.setPairActive(mockPair, 'user-456')
      })

      expect(result.current.currentPair).toEqual(mockPair)
      expect(result.current.pairPartner).toEqual({
        id: 'user-123',
        name: '患者太郎',
        role: 'patient',
      })
      expect(result.current.hasPair).toBe(true)
    })
  })

  describe('setPairInactive', () => {
    it('ペア情報をクリアできる', () => {
      const { result } = renderHook(() => usePairStore())

      act(() => {
        result.current.setPairActive(mockPair, 'user-123')
        result.current.setPairInactive()
      })

      expect(result.current.currentPair).toBeNull()
      expect(result.current.pairPartner).toBeNull()
      expect(result.current.hasPair).toBe(false)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('エラー情報を設定できる', () => {
      const { result } = renderHook(() => usePairStore())
      const error: PairError = {
        code: 'TEST_ERROR',
        message: 'テストエラー',
      }

      act(() => {
        result.current.setPairInactive(error)
      })

      expect(result.current.error).toEqual(error)
    })
  })

  describe('fetchPair', () => {
    it('ペア情報を取得して状態を更新できる', async () => {
      const { result } = renderHook(() => usePairStore())

      vi.mocked(pairService.getCurrentPair).mockResolvedValue({
        success: true,
        data: mockPair,
      })

      await act(async () => {
        await result.current.fetchPair()
      })

      await waitFor(() => {
        expect(result.current.currentPair).toEqual(mockPair)
        expect(result.current.hasPair).toBe(true)
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('ペアが存在しない場合の状態を正しく設定できる', async () => {
      const { result } = renderHook(() => usePairStore())

      vi.mocked(pairService.getCurrentPair).mockResolvedValue({
        success: true,
        data: undefined,
      })

      await act(async () => {
        await result.current.fetchPair()
      })

      await waitFor(() => {
        expect(result.current.currentPair).toBeNull()
        expect(result.current.hasPair).toBe(false)
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('エラー時の状態を正しく設定できる', async () => {
      const { result } = renderHook(() => usePairStore())
      const error: PairError = {
        code: 'FETCH_ERROR',
        message: 'ペア情報の取得に失敗しました',
      }

      vi.mocked(pairService.getCurrentPair).mockResolvedValue({
        success: false,
        error,
      })

      await act(async () => {
        await result.current.fetchPair()
      })

      await waitFor(() => {
        expect(result.current.error).toEqual(error)
        expect(result.current.isLoading).toBe(false)
      })
    })
  })

  describe('reset', () => {
    it('状態を初期値にリセットできる', () => {
      const { result } = renderHook(() => usePairStore())

      act(() => {
        result.current.setPairActive(mockPair, 'user-123')
        result.current.reset()
      })

      expect(result.current.currentPair).toBeNull()
      expect(result.current.pairPartner).toBeNull()
      expect(result.current.hasPair).toBe(false)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.isInitialized).toBe(true)
    })
  })

  describe('selectors', () => {
    it('getHasPairが正しく動作する', () => {
      act(() => {
        usePairStore.getState().setPairActive(mockPair, 'user-123')
      })

      expect(pairSelectors.getHasPair()).toBe(true)
    })

    it('getCurrentPairが正しく動作する', () => {
      act(() => {
        usePairStore.getState().setPairActive(mockPair, 'user-123')
      })

      expect(pairSelectors.getCurrentPair()).toEqual(mockPair)
    })

    it('getPairPartnerが正しく動作する', () => {
      act(() => {
        usePairStore.getState().setPairActive(mockPair, 'user-123')
      })

      expect(pairSelectors.getPairPartner()).toEqual({
        id: 'user-456',
        name: '支援者花子',
        role: 'supporter',
      })
    })
  })

  describe('storeHelpers', () => {
    it('handleAuthSuccessがペア情報を取得する', async () => {
      vi.mocked(pairService.getCurrentPair).mockResolvedValue({
        success: true,
        data: mockPair,
      })

      await act(async () => {
        await pairStoreHelpers.handleAuthSuccess()
      })

      await waitFor(() => {
        expect(pairService.getCurrentPair).toHaveBeenCalled()
        expect(usePairStore.getState().currentPair).toEqual(mockPair)
      })
    })

    it('handleAuthLogoutが状態をリセットする', () => {
      act(() => {
        usePairStore.getState().setPairActive(mockPair, 'user-123')
        pairStoreHelpers.handleAuthLogout()
      })

      expect(usePairStore.getState().currentPair).toBeNull()
      expect(usePairStore.getState().hasPair).toBe(false)
    })

    it('handlePairCreatedがペア情報を設定する', async () => {
      await act(async () => {
        await pairStoreHelpers.handlePairCreated(mockPair)
      })

      expect(usePairStore.getState().currentPair).toEqual(mockPair)
      expect(usePairStore.getState().hasPair).toBe(true)
    })

    it('handlePairTerminatedがペア情報をクリアする', () => {
      act(() => {
        usePairStore.getState().setPairActive(mockPair, 'user-123')
        pairStoreHelpers.handlePairTerminated()
      })

      expect(usePairStore.getState().currentPair).toBeNull()
      expect(usePairStore.getState().hasPair).toBe(false)
    })
  })
})
