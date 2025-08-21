/**
 * ペア管理状態管理フック
 * 招待とペア情報の統合管理
 */

'use client'

import { useAuth } from '@/features/auth'
import { pairStoreHelpers, usePairStore } from '@/stores/pairs'
import { useCallback, useEffect, useState } from 'react'
import {
  cancelInvitation,
  createInvitation,
  getCurrentPair,
  getReceivedInvitations,
  getSentInvitations,
  respondToInvitation,
  terminatePair,
} from '../api/pair-service'
import type {
  CreateInvitationFormData,
  Invitation,
  InvitationResponseFormData,
  InvitationState,
  PairError,
  PairManagementState,
  PairState,
  UserPair,
} from '../types'

/**
 * ペア管理状態管理カスタムフック
 */
export function usePairs(): PairManagementState {
  const { isAuthenticated, user } = useAuth()

  const [invitations, setInvitations] = useState<InvitationState>({
    sentInvitations: [],
    receivedInvitations: [],
    isLoading: false,
  })

  // Zustandストアからペア状態を取得
  const {
    currentPair,
    pairPartner,
    hasPair,
    isLoading: pairLoading,
    error: pairError,
    fetchPair,
    reset: resetPair,
  } = usePairStore()

  const [pairs, setPairs] = useState<PairState>({
    currentPair,
    isLoading: pairLoading,
    error: pairError,
  })

  /**
   * 送信した招待一覧を取得
   */
  const refreshSentInvitations = useCallback(async () => {
    if (!isAuthenticated) return

    setInvitations((prev) => ({
      ...prev,
      isLoading: true,
    }))

    try {
      const result = await getSentInvitations()
      if (result.success && result.data) {
        setInvitations((prev) => ({
          ...prev,
          sentInvitations: result.data || [],
          isLoading: false,
        }))
      } else {
        setInvitations((prev) => ({
          ...prev,
          error: result.error,
          isLoading: false,
        }))
      }
    } catch {
      setInvitations((prev) => ({
        ...prev,
        error: {
          code: 'FETCH_ERROR',
          message: '送信した招待の取得に失敗しました',
        },
        isLoading: false,
      }))
    }
  }, [isAuthenticated])

  /**
   * 受信した招待一覧を取得
   */
  const refreshReceivedInvitations = useCallback(async () => {
    if (!isAuthenticated) return

    setInvitations((prev) => ({
      ...prev,
      isLoading: true,
    }))

    try {
      const result = await getReceivedInvitations()
      if (result.success && result.data) {
        setInvitations((prev) => ({
          ...prev,
          receivedInvitations: result.data || [],
          isLoading: false,
        }))
      } else {
        setInvitations((prev) => ({
          ...prev,
          error: result.error,
          isLoading: false,
        }))
      }
    } catch {
      setInvitations((prev) => ({
        ...prev,
        error: {
          code: 'FETCH_ERROR',
          message: '受信した招待の取得に失敗しました',
        },
        isLoading: false,
      }))
    }
  }, [isAuthenticated])

  /**
   * 招待一覧を全て取得
   */
  const refreshInvitations = useCallback(async () => {
    await Promise.all([refreshSentInvitations(), refreshReceivedInvitations()])
  }, [refreshSentInvitations, refreshReceivedInvitations])

  /**
   * 現在のペア情報を取得（Zustandストア経由）
   */
  const refreshPairs = useCallback(async () => {
    if (!isAuthenticated) return
    await fetchPair()
  }, [isAuthenticated, fetchPair])

  /**
   * 招待作成
   */
  const handleCreateInvitation = useCallback(
    async (data: CreateInvitationFormData) => {
      const result = await createInvitation(data)

      if (result.success) {
        // 送信した招待一覧を更新
        await refreshSentInvitations()
      }

      return result
    },
    [refreshSentInvitations]
  )

  /**
   * 招待への応答
   */
  const handleRespondToInvitation = useCallback(
    async (data: InvitationResponseFormData) => {
      const result = await respondToInvitation(data)

      if (result.success) {
        // 受信した招待一覧を更新
        await refreshReceivedInvitations()

        // ペア作成が成功した場合はストアヘルパーで状態更新
        if (data.action === 'accept' && result.data?.pairId) {
          // ペア情報を再取得してストアに反映
          await fetchPair()
        }
      }

      return result
    },
    [refreshReceivedInvitations, fetchPair]
  )

  /**
   * 招待キャンセル
   */
  const handleCancelInvitation = useCallback(
    async (invitationId: string) => {
      const result = await cancelInvitation(invitationId)

      if (result.success) {
        // 送信した招待一覧を更新
        await refreshSentInvitations()
      }

      return result
    },
    [refreshSentInvitations]
  )

  /**
   * ペア終了
   */
  const handleTerminatePair = useCallback(async (pairId: string) => {
    const result = await terminatePair(pairId)

    if (result.success) {
      // ペア状態をクリア
      pairStoreHelpers.handlePairTerminated()
    }

    return result
  }, [])

  /**
   * 初期データ読み込み
   */
  useEffect(() => {
    if (isAuthenticated && user) {
      refreshInvitations()
      // ペア情報はZustandストアが自動的に管理
    }
  }, [isAuthenticated, user, refreshInvitations])

  // Zustandストアの状態をPairStateに同期
  useEffect(() => {
    setPairs({
      currentPair,
      isLoading: pairLoading,
      error: pairError,
    })
  }, [currentPair, pairLoading, pairError])

  return {
    invitations,
    pairs,
    actions: {
      createInvitation: handleCreateInvitation,
      respondToInvitation: handleRespondToInvitation,
      cancelInvitation: handleCancelInvitation,
      terminatePair: handleTerminatePair,
      refreshInvitations,
      refreshPairs,
    },
  }
}

/**
 * 招待トークン専用フック
 */
export function useInvitationToken(token?: string) {
  const [invitationDetails, setInvitationDetails] = useState<{
    invitation: Invitation
    isValid: boolean
    isExpired: boolean
    alreadyResponded: boolean
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return

    const fetchInvitationDetails = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const { getInvitationByToken } = await import('../api/pair-service')
        const result = await getInvitationByToken(token)

        if (result.success && result.data) {
          setInvitationDetails(result.data)
        } else {
          setError(result.error?.message || '招待情報の取得に失敗しました')
        }
      } catch {
        setError('予期しないエラーが発生しました')
      } finally {
        setIsLoading(false)
      }
    }

    fetchInvitationDetails()
  }, [token])

  return {
    invitationDetails,
    isLoading,
    error,
  }
}

/**
 * usePair hookの戻り値型
 */
export interface UsePairReturn {
  /** 現在のペア情報 */
  currentPair: UserPair | null
  /** ペア相手の情報 */
  pairPartner: {
    id: string
    name: string
    role: 'patient' | 'supporter'
  } | null
  /** ペアの有無 */
  hasPair: boolean
  /** ローディング状態 */
  isLoading: boolean
  /** エラー情報 */
  error: PairError | null
  /** ペア情報の再取得 */
  refetch: () => Promise<void>
  /** ペア状態のリセット */
  reset: () => void
}

/**
 * ペア状態管理フック（Zustandストア直接アクセス版）
 * @returns ペア状態と操作関数
 */
export function usePair(): UsePairReturn {
  const { currentPair, pairPartner, hasPair, isLoading, error, fetchPair, reset } = usePairStore()

  const { isAuthenticated, isInitialized: authInitialized } = useAuth()
  const isInitialized = usePairStore((state) => state.isInitialized)

  // 認証完了時にペア情報を自動取得
  useEffect(() => {
    if (isAuthenticated && authInitialized && !isInitialized) {
      fetchPair()
    }
  }, [isAuthenticated, authInitialized, isInitialized, fetchPair])

  // 認証解除時にペア情報をクリア
  useEffect(() => {
    if (!isAuthenticated && isInitialized) {
      reset()
    }
  }, [isAuthenticated, isInitialized, reset])

  return {
    currentPair,
    pairPartner,
    hasPair,
    isLoading,
    error,
    refetch: fetchPair,
    reset,
  }
}

/**
 * 現在のユーザーの役割を取得するフック
 * @returns 現在のユーザーがペア内で持つ役割
 */
export function useCurrentUserPairRole(): 'patient' | 'supporter' | null {
  const { currentPair } = usePairStore()
  const { user } = useAuth()

  if (!currentPair || !user) {
    return null
  }

  return currentPair.patientId === user.id ? 'patient' : 'supporter'
}

/**
 * ペア権限チェックフック
 * @returns 各種権限の有無
 */
export function usePairPermissions() {
  const userRole = useCurrentUserPairRole()
  const { hasPair } = usePairStore()

  return {
    /** ペアを組んでいるか */
    hasPair,
    /** 患者として完全権限を持つか */
    hasFullPermission: userRole === 'patient',
    /** 支援者として閲覧権限を持つか */
    hasReadPermission: userRole === 'supporter',
    /** 現在の役割 */
    currentRole: userRole,
  }
}
