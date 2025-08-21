/**
 * ペア状態管理 - Zustand store
 * グローバルペア状態管理、リアクティブ更新、認証連携を提供
 */

import { getCurrentPair } from '@/features/pairs/api/pair-service'
import type { PairError, UserPair } from '@/features/pairs/types'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * ペア状態の型定義
 */
export interface PairState {
  /** 現在のペア情報 */
  currentPair: UserPair | null
  /** ペア相手の情報（役割に応じて患者or支援者） */
  pairPartner: {
    id: string
    name: string
    role: 'patient' | 'supporter'
  } | null
  /** ローディング状態 */
  isLoading: boolean
  /** エラー情報 */
  error: PairError | null
  /** ペア状態（簡易アクセス用） */
  hasPair: boolean
  /** 初期化完了フラグ */
  isInitialized: boolean
}

/**
 * ペアアクションの型定義
 */
export interface PairActions {
  /** ペア情報を設定 */
  setPair: (pair: UserPair | null) => void
  /** ローディング状態を設定 */
  setLoading: (loading: boolean) => void
  /** エラー情報を設定 */
  setError: (error: PairError | null) => void
  /** ペア状態をリセット */
  reset: () => void
  /** ペア情報を取得・更新 */
  fetchPair: () => Promise<void>
  /** ペア情報がある場合の状態更新 */
  setPairActive: (pair: UserPair, currentUserId: string) => void
  /** ペア情報がない場合の状態更新 */
  setPairInactive: (error?: PairError) => void
  /** 初期化完了をマーク */
  setInitialized: () => void
}

/**
 * Zustandペアストア型
 */
export type PairStore = PairState & PairActions

/**
 * 初期状態
 */
const initialState: PairState = {
  currentPair: null,
  pairPartner: null,
  isLoading: true, // 初期化時はloading=true
  error: null,
  hasPair: false,
  isInitialized: false,
}

/**
 * ブラウザ環境でのみlocalStorageを使用
 */
const createStorage = () => {
  if (typeof window === 'undefined') {
    // SSR環境ではダミーのストレージを返す
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    }
  }
  return localStorage
}

/**
 * パートナー情報を抽出するヘルパー関数
 */
function extractPartnerInfo(pair: UserPair, currentUserId: string): PairState['pairPartner'] {
  const isPatient = pair.patientId === currentUserId

  if (isPatient) {
    return {
      id: pair.supporterId,
      name: pair.supporterName,
      role: 'supporter',
    }
  }

  return {
    id: pair.patientId,
    name: pair.patientName,
    role: 'patient',
  }
}

/**
 * Zustandペアストア - 永続化対応
 */
export const usePairStore = create<PairStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setPair: (pair: UserPair | null) => {
        set({ currentPair: pair })
      },

      setLoading: (isLoading: boolean) => {
        set({ isLoading })
      },

      setError: (error: PairError | null) => {
        set({ error })
      },

      reset: () => {
        set({
          ...initialState,
          isLoading: false,
          isInitialized: true,
        })
      },

      fetchPair: async () => {
        set({ isLoading: true, error: null })

        try {
          const result = await getCurrentPair()

          if (result.success) {
            if (result.data) {
              // 認証ストアから現在のユーザーIDを取得
              const { useAuthStore } = await import('@/stores/auth')
              const currentUser = useAuthStore.getState().user

              if (currentUser) {
                get().setPairActive(result.data, currentUser.id)
              } else {
                get().setPairInactive()
              }
            } else {
              get().setPairInactive()
            }
          } else {
            get().setPairInactive(result.error)
          }
        } catch (error) {
          get().setPairInactive({
            code: 'FETCH_ERROR',
            message: 'ペア情報の取得に失敗しました',
            details: String(error),
          })
        }
      },

      setPairActive: (pair: UserPair, currentUserId: string) => {
        const pairPartner = extractPartnerInfo(pair, currentUserId)

        set({
          currentPair: pair,
          pairPartner,
          hasPair: true,
          isLoading: false,
          error: null,
          isInitialized: true,
        })
      },

      setPairInactive: (error?: PairError) => {
        set({
          currentPair: null,
          pairPartner: null,
          hasPair: false,
          isLoading: false,
          error: error || null,
          isInitialized: true,
        })
      },

      setInitialized: () => {
        set({ isInitialized: true, isLoading: false })
      },
    }),
    {
      name: 'pair-storage',
      storage: createJSONStorage(() => createStorage()),
      partialize: (state) => ({
        currentPair: state.currentPair,
        pairPartner: state.pairPartner,
        hasPair: state.hasPair,
        isInitialized: state.isInitialized,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // ローディング状態とエラーは永続化しない
          state.isLoading = false
          state.error = null
        }
      },
    }
  )
)

/**
 * ペア状態の selector
 */
export const pairSelectors = {
  /** ペア有無のみを取得 */
  getHasPair: () => usePairStore.getState().hasPair,

  /** 現在のペア情報のみを取得 */
  getCurrentPair: () => usePairStore.getState().currentPair,

  /** パートナー情報のみを取得 */
  getPairPartner: () => usePairStore.getState().pairPartner,

  /** ローディング状態のみを取得 */
  getLoadingState: () => usePairStore.getState().isLoading,

  /** 初期化状態のみを取得 */
  getInitializedState: () => usePairStore.getState().isInitialized,
}

/**
 * 型安全なストアアクセス用のヘルパー
 */
export const pairStoreHelpers = {
  /** 認証成功時のペア情報自動取得 */
  handleAuthSuccess: async () => {
    await usePairStore.getState().fetchPair()
  },

  /** 認証解除時のペア情報クリア */
  handleAuthLogout: () => {
    usePairStore.getState().reset()
  },

  /** ペア作成成功時の状態更新 */
  handlePairCreated: async (pair: UserPair) => {
    const { useAuthStore } = await import('@/stores/auth')
    const currentUser = useAuthStore.getState().user

    if (currentUser) {
      usePairStore.getState().setPairActive(pair, currentUser.id)
    }
  },

  /** ペア解除時の状態更新 */
  handlePairTerminated: () => {
    usePairStore.getState().setPairInactive()
  },
}
