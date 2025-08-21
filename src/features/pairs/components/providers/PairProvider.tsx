/**
 * ペア状態管理Provider
 * アプリケーション全体でペア状態を提供
 */

'use client'

import React, { createContext, useContext, useMemo, type ReactNode } from 'react'
import { usePair, usePairPermissions } from '../../hooks/use-pairs'
import type { PairError, UserPair } from '../../types'

/**
 * PairProvider Context型定義
 */
interface PairContextValue {
  /** ペア情報 */
  currentPair: UserPair | null
  pairPartner: {
    id: string
    name: string
    role: 'patient' | 'supporter'
  } | null

  /** ペア状態 */
  hasPair: boolean
  isLoading: boolean
  error: PairError | null

  /** 権限情報 */
  hasFullPermission: boolean
  hasReadPermission: boolean
  currentRole: 'patient' | 'supporter' | null

  /** アクション */
  refetch: () => Promise<void>
  reset: () => void
}

/**
 * PairContext作成
 */
const PairContext = createContext<PairContextValue | null>(null)

/**
 * PairProvider Props
 */
interface PairProviderProps {
  children: ReactNode
}

/**
 * PairProvider実装
 */
export function PairProvider({ children }: PairProviderProps) {
  const pairData = usePair()
  const permissions = usePairPermissions()

  // パフォーマンス最適化: 不要な再レンダリングを防止
  const contextValue: PairContextValue = useMemo(
    () => ({
      currentPair: pairData.currentPair,
      pairPartner: pairData.pairPartner,
      hasPair: pairData.hasPair,
      isLoading: pairData.isLoading,
      error: pairData.error,
      hasFullPermission: permissions.hasFullPermission,
      hasReadPermission: permissions.hasReadPermission,
      currentRole: permissions.currentRole,
      refetch: pairData.refetch,
      reset: pairData.reset,
    }),
    [
      pairData.currentPair,
      pairData.pairPartner,
      pairData.hasPair,
      pairData.isLoading,
      pairData.error,
      permissions.hasFullPermission,
      permissions.hasReadPermission,
      permissions.currentRole,
      pairData.refetch,
      pairData.reset,
    ]
  )

  return <PairContext.Provider value={contextValue}>{children}</PairContext.Provider>
}

/**
 * usePairContext カスタムフック
 */
export function usePairContext(): PairContextValue {
  const context = useContext(PairContext)
  if (!context) {
    throw new Error('usePairContext must be used within a PairProvider')
  }
  return context
}
