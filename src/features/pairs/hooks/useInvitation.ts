/**
 * 招待システム カスタムフック
 * 双方向招待・8桁コードシステム対応
 */

import type {
  CreateInvitationParams,
  CreateInvitationResult,
  FindInvitationParams,
  InvitationDetails,
  InvitationError,
  InvitationFilter,
  InvitationListResult,
  InvitationResponseResult,
  RespondToInvitationParams,
} from '../types/invitation'

/**
 * useInvitationCreate hookの戻り値型
 */
export interface UseInvitationCreateReturn {
  /** 招待作成関数 */
  createInvitation: (params: CreateInvitationParams) => Promise<CreateInvitationResult | null>
  /** ローディング状態 */
  isCreating: boolean
  /** エラー情報 */
  error: InvitationError | null
  /** 最後に作成した招待情報 */
  lastCreated: CreateInvitationResult | null
  /** エラーをクリア */
  clearError: () => void
}

/**
 * useInvitationFind hookの戻り値型
 */
export interface UseInvitationFindReturn {
  /** 招待検索関数 */
  findInvitation: (params: FindInvitationParams) => Promise<InvitationDetails | null>
  /** ローディング状態 */
  isSearching: boolean
  /** エラー情報 */
  error: InvitationError | null
  /** 検索結果 */
  foundInvitation: InvitationDetails | null
  /** エラーをクリア */
  clearError: () => void
  /** 検索結果をクリア */
  clearResult: () => void
}

/**
 * useInvitationResponse hookの戻り値型
 */
export interface UseInvitationResponseReturn {
  /** 招待応答関数 */
  respondToInvitation: (
    params: RespondToInvitationParams
  ) => Promise<InvitationResponseResult | null>
  /** ローディング状態 */
  isResponding: boolean
  /** エラー情報 */
  error: InvitationError | null
  /** 応答結果 */
  responseResult: InvitationResponseResult | null
  /** エラーをクリア */
  clearError: () => void
}

/**
 * useInvitationList hookの戻り値型
 */
export interface UseInvitationListReturn {
  /** 招待一覧データ */
  invitations: InvitationListResult | null
  /** 招待一覧更新関数 */
  refreshInvitations: (filter?: InvitationFilter) => Promise<void>
  /** ローディング状態 */
  isLoading: boolean
  /** エラー情報 */
  error: InvitationError | null
  /** フィルター更新 */
  updateFilter: (filter: InvitationFilter) => void
  /** 現在のフィルター */
  currentFilter: InvitationFilter
  /** エラーをクリア */
  clearError: () => void
}

/**
 * useInvitationManager hookの戻り値型（統合管理）
 */
export interface UseInvitationManagerReturn {
  /** 招待作成 */
  create: UseInvitationCreateReturn
  /** 招待検索 */
  find: UseInvitationFindReturn
  /** 招待応答 */
  respond: UseInvitationResponseReturn
  /** 招待一覧 */
  list: UseInvitationListReturn
  /** 全体リフレッシュ */
  refreshAll: () => Promise<void>
  /** 全エラークリア */
  clearAllErrors: () => void
}

/**
 * 招待コード入力フィールドの型定義
 */
export interface InvitationCodeInputProps {
  /** 入力値 */
  value: string
  /** 値変更ハンドラー */
  onChange: (value: string) => void
  /** 無効状態 */
  disabled?: boolean
  /** エラーメッセージ */
  error?: string
  /** プレースホルダー */
  placeholder?: string
  /** 自動フォーマット（8桁区切り） */
  autoFormat?: boolean
}

/**
 * 招待リンク共有の型定義
 */
export interface InvitationShareData {
  /** 招待URL */
  url: string
  /** QRコードデータURL */
  qrCodeDataUrl: string
  /** 共有用テキスト */
  shareText: string
  /** ショートURL（任意） */
  shortUrl?: string
}

/**
 * 招待通知設定の型定義
 */
export interface InvitationNotificationSettings {
  /** メール通知有効 */
  emailEnabled: boolean
  /** プッシュ通知有効 */
  pushEnabled: boolean
  /** リマインダー設定（期限前日） */
  reminderEnabled: boolean
  /** 自動期限延長 */
  autoExtendEnabled: boolean
}

// =========================================
// 実装部分（カスタムフック）
// =========================================

import { useCallback, useState } from 'react'
import {
  createInvitation as apiCreateInvitation,
  findByCode as apiFindByCode,
} from '../api/invitation'

/**
 * 招待作成用カスタムフック
 */
export function useInvitationCreate(): UseInvitationCreateReturn {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<InvitationError | null>(null)
  const [lastCreated, setLastCreated] = useState<CreateInvitationResult | null>(null)

  const createInvitation = useCallback(async (params: CreateInvitationParams) => {
    setIsCreating(true)
    setError(null)

    try {
      const result = await apiCreateInvitation(params)
      setLastCreated(result)
      return result
    } catch (err) {
      const invitationError: InvitationError = {
        code: 'GENERATION_FAILED',
        message: err instanceof Error ? err.message : '招待作成に失敗しました',
        details: String(err),
      }
      setError(invitationError)
      return null
    } finally {
      setIsCreating(false)
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    createInvitation,
    isCreating,
    error,
    lastCreated,
    clearError,
  }
}

/**
 * 招待検索用カスタムフック
 */
export function useInvitationFind(): UseInvitationFindReturn {
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<InvitationError | null>(null)
  const [foundInvitation, setFoundInvitation] = useState<InvitationDetails | null>(null)

  const findInvitation = useCallback(async (params: FindInvitationParams) => {
    setIsSearching(true)
    setError(null)

    try {
      const result = await apiFindByCode(params)
      setFoundInvitation(result)
      return result
    } catch (err) {
      const invitationError: InvitationError = {
        code: 'INVITATION_NOT_FOUND',
        message: err instanceof Error ? err.message : '招待検索に失敗しました',
        details: String(err),
      }
      setError(invitationError)
      return null
    } finally {
      setIsSearching(false)
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const clearResult = useCallback(() => {
    setFoundInvitation(null)
  }, [])

  return {
    findInvitation,
    isSearching,
    error,
    foundInvitation,
    clearError,
    clearResult,
  }
}

/**
 * 招待応答用カスタムフック（プレースホルダー実装）
 */
export function useInvitationResponse(): UseInvitationResponseReturn {
  const [isResponding, setIsResponding] = useState(false)
  const [error, setError] = useState<InvitationError | null>(null)
  const [responseResult, setResponseResult] = useState<InvitationResponseResult | null>(null)

  const respondToInvitation = useCallback(async (params: RespondToInvitationParams) => {
    setIsResponding(true)
    setError(null)

    try {
      // TODO: T013で実装予定
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const result: InvitationResponseResult = {
        success: true,
        invitation: {
          id: 'placeholder',
          inviterId: 'placeholder',
          inviteeEmail: params.inviteeEmail,
          targetRole: 'patient',
          invitationCode: params.invitationCode,
          status: params.action === 'accept' ? 'accepted' : 'rejected',
          expiresAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          message: null,
        },
      }

      setResponseResult(result)
      return result
    } catch (err) {
      const invitationError: InvitationError = {
        code: 'VALIDATION_FAILED',
        message: err instanceof Error ? err.message : '招待応答に失敗しました',
        details: String(err),
      }
      setError(invitationError)
      return null
    } finally {
      setIsResponding(false)
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    respondToInvitation,
    isResponding,
    error,
    responseResult,
    clearError,
  }
}

/**
 * 招待一覧用カスタムフック（プレースホルダー実装）
 */
export function useInvitationList(): UseInvitationListReturn {
  const [invitations, setInvitations] = useState<InvitationListResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<InvitationError | null>(null)
  const [currentFilter, setCurrentFilter] = useState<InvitationFilter>({})

  const refreshInvitations = useCallback(async (filter?: InvitationFilter) => {
    setIsLoading(true)
    setError(null)

    try {
      // TODO: 招待一覧API実装時に対応
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const result: InvitationListResult = {
        invitations: [],
        totalCount: 0,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false,
        },
        stats: {
          sentCount: 0,
          receivedCount: 0,
          acceptedCount: 0,
          expiredCount: 0,
          todayCreatedCount: 0,
        },
      }

      setInvitations(result)
      if (filter) setCurrentFilter(filter)
    } catch (err) {
      const invitationError: InvitationError = {
        code: 'VALIDATION_FAILED',
        message: err instanceof Error ? err.message : '招待一覧取得に失敗しました',
        details: String(err),
      }
      setError(invitationError)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateFilter = useCallback(
    (filter: InvitationFilter) => {
      setCurrentFilter(filter)
      refreshInvitations(filter)
    },
    [refreshInvitations]
  )

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    invitations,
    refreshInvitations,
    isLoading,
    error,
    updateFilter,
    currentFilter,
    clearError,
  }
}

/**
 * 招待統合管理用カスタムフック
 */
export function useInvitationManager(): UseInvitationManagerReturn {
  const create = useInvitationCreate()
  const find = useInvitationFind()
  const respond = useInvitationResponse()
  const list = useInvitationList()

  const refreshAll = useCallback(async () => {
    await list.refreshInvitations()
  }, [list])

  const clearAllErrors = useCallback(() => {
    create.clearError()
    find.clearError()
    respond.clearError()
    list.clearError()
  }, [create, find, respond, list])

  return {
    create,
    find,
    respond,
    list,
    refreshAll,
    clearAllErrors,
  }
}
