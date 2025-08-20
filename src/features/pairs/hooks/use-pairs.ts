/**
 * ペア管理状態管理フック
 * 招待とペア情報の統合管理
 */

'use client'

import { useAuth } from '@/features/auth'
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
  PairManagementState,
  PairState,
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

  const [pairs, setPairs] = useState<PairState>({
    isLoading: false,
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
   * 現在のペア情報を取得
   */
  const refreshPairs = useCallback(async () => {
    if (!isAuthenticated) return

    setPairs((prev) => ({
      ...prev,
      isLoading: true,
    }))

    try {
      const result = await getCurrentPair()
      if (result.success) {
        setPairs({
          currentPair: result.data,
          isLoading: false,
        })
      } else {
        setPairs({
          error: result.error,
          isLoading: false,
        })
      }
    } catch {
      setPairs({
        error: {
          code: 'FETCH_ERROR',
          message: 'ペア情報の取得に失敗しました',
        },
        isLoading: false,
      })
    }
  }, [isAuthenticated])

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
        // 受信した招待一覧とペア情報を更新
        await Promise.all([refreshReceivedInvitations(), refreshPairs()])
      }

      return result
    },
    [refreshReceivedInvitations, refreshPairs]
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
  const handleTerminatePair = useCallback(
    async (pairId: string) => {
      const result = await terminatePair(pairId)

      if (result.success) {
        // ペア情報を更新
        await refreshPairs()
      }

      return result
    },
    [refreshPairs]
  )

  /**
   * 初期データ読み込み
   */
  useEffect(() => {
    if (isAuthenticated && user) {
      refreshInvitations()
      refreshPairs()
    }
  }, [isAuthenticated, user, refreshInvitations, refreshPairs])

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
