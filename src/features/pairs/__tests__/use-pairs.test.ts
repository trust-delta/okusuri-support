/**
 * ペア管理フックのテスト
 */

import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { UserPair } from '../types'

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
vi.mock('../api/pair-service', () => ({
  getCurrentPair: vi.fn(),
  createInvitation: vi.fn(),
  findInvitationByCode: vi.fn(),
  respondToInvitation: vi.fn(),
  terminatePair: vi.fn(),
  getSentInvitations: vi.fn(),
  getReceivedInvitations: vi.fn(),
}))
vi.mock('@/features/auth', () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: true,
    isInitialized: true,
    user: { id: 'user-123', email: 'test@example.com', role: 'patient' },
  })),
}))

import { usePairStore } from '@/stores/pairs'
import * as pairService from '../api/pair-service'
// モック後にインポート
import { useCurrentUserPairRole, usePair, usePairPermissions } from '../hooks/use-pairs'

describe('usePair', () => {
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
      isLoading: false,
      error: null,
      hasPair: false,
      isInitialized: false,
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('基本機能', () => {
    it('ペア情報を取得できる', () => {
      usePairStore.setState({
        currentPair: mockPair,
        pairPartner: {
          id: 'user-456',
          name: '支援者花子',
          role: 'supporter',
        },
        hasPair: true,
        isLoading: false,
        error: null,
        isInitialized: true,
      })

      const { result } = renderHook(() => usePair())

      expect(result.current.currentPair).toEqual(mockPair)
      expect(result.current.pairPartner).toEqual({
        id: 'user-456',
        name: '支援者花子',
        role: 'supporter',
      })
      expect(result.current.hasPair).toBe(true)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('ペア情報を再取得できる', async () => {
      ;(
        pairService.getCurrentPair as vi.MockedFunction<typeof pairService.getCurrentPair>
      ).mockResolvedValue({
        success: true,
        data: mockPair,
      })

      const { result } = renderHook(() => usePair())

      await act(async () => {
        await result.current.refetch()
      })

      await waitFor(() => {
        expect(pairService.getCurrentPair).toHaveBeenCalled()
      })
    })

    it('ペア状態をリセットできる', () => {
      usePairStore.setState({
        currentPair: mockPair,
        hasPair: true,
        isInitialized: true,
      })

      const { result } = renderHook(() => usePair())

      act(() => {
        result.current.reset()
      })

      expect(result.current.currentPair).toBeNull()
      expect(result.current.hasPair).toBe(false)
    })
  })

  describe('認証連携', () => {
    it('認証完了時にペア情報を自動取得する', async () => {
      ;(
        pairService.getCurrentPair as vi.MockedFunction<typeof pairService.getCurrentPair>
      ).mockResolvedValue({
        success: true,
        data: mockPair,
      })

      const { useAuth } = await import('@/features/auth')
      ;(useAuth as vi.MockedFunction<typeof useAuth>).mockReturnValue({
        isAuthenticated: true,
        isInitialized: true,
        user: { id: 'user-123', email: 'test@example.com', role: 'patient' },
      } as never)

      renderHook(() => usePair())

      await waitFor(() => {
        expect(pairService.getCurrentPair).toHaveBeenCalled()
      })
    })

    it('認証解除時にペア情報をクリアする', async () => {
      usePairStore.setState({
        currentPair: mockPair,
        hasPair: true,
        isInitialized: true,
      })

      const { useAuth } = await import('@/features/auth')
      ;(useAuth as vi.MockedFunction<typeof useAuth>).mockReturnValue({
        isAuthenticated: false,
        isInitialized: true,
        user: null,
      } as never)

      renderHook(() => usePair())

      await waitFor(() => {
        expect(usePairStore.getState().currentPair).toBeNull()
        expect(usePairStore.getState().hasPair).toBe(false)
      })
    })
  })
})

describe('useCurrentUserPairRole', () => {
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
    usePairStore.setState({
      currentPair: null,
      pairPartner: null,
      isLoading: false,
      error: null,
      hasPair: false,
      isInitialized: false,
    })
    vi.clearAllMocks()
  })

  it('患者として認識される', async () => {
    usePairStore.setState({
      currentPair: mockPair,
      hasPair: true,
    })

    const { useAuth } = await import('@/features/auth')
    ;(useAuth as vi.MockedFunction<typeof useAuth>).mockReturnValue({
      user: { id: 'user-123', role: 'patient' },
    } as never)

    const { result } = renderHook(() => useCurrentUserPairRole())

    expect(result.current).toBe('patient')
  })

  it('支援者として認識される', async () => {
    usePairStore.setState({
      currentPair: mockPair,
      hasPair: true,
    })

    const { useAuth } = await import('@/features/auth')
    ;(useAuth as vi.MockedFunction<typeof useAuth>).mockReturnValue({
      user: { id: 'user-456', role: 'supporter' },
    } as never)

    const { result } = renderHook(() => useCurrentUserPairRole())

    expect(result.current).toBe('supporter')
  })

  it('ペアがない場合はnullを返す', () => {
    const { result } = renderHook(() => useCurrentUserPairRole())

    expect(result.current).toBeNull()
  })
})

describe('usePairPermissions', () => {
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
    usePairStore.setState({
      currentPair: null,
      pairPartner: null,
      isLoading: false,
      error: null,
      hasPair: false,
      isInitialized: false,
    })
    vi.clearAllMocks()
  })

  it('患者の権限を正しく判定する', async () => {
    usePairStore.setState({
      currentPair: mockPair,
      hasPair: true,
    })

    const { useAuth } = await import('@/features/auth')
    ;(useAuth as vi.MockedFunction<typeof useAuth>).mockReturnValue({
      user: { id: 'user-123', role: 'patient' },
    } as never)

    const { result } = renderHook(() => usePairPermissions())

    expect(result.current.hasPair).toBe(true)
    expect(result.current.hasFullPermission).toBe(true)
    expect(result.current.hasReadPermission).toBe(false)
    expect(result.current.currentRole).toBe('patient')
  })

  it('支援者の権限を正しく判定する', async () => {
    usePairStore.setState({
      currentPair: mockPair,
      hasPair: true,
    })

    const { useAuth } = await import('@/features/auth')
    ;(useAuth as vi.MockedFunction<typeof useAuth>).mockReturnValue({
      user: { id: 'user-456', role: 'supporter' },
    } as never)

    const { result } = renderHook(() => usePairPermissions())

    expect(result.current.hasPair).toBe(true)
    expect(result.current.hasFullPermission).toBe(false)
    expect(result.current.hasReadPermission).toBe(true)
    expect(result.current.currentRole).toBe('supporter')
  })

  it('ペアがない場合の権限を正しく判定する', () => {
    const { result } = renderHook(() => usePairPermissions())

    expect(result.current.hasPair).toBe(false)
    expect(result.current.hasFullPermission).toBe(false)
    expect(result.current.hasReadPermission).toBe(false)
    expect(result.current.currentRole).toBeNull()
  })
})
