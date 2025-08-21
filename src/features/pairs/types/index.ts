/**
 * ペア管理機能の型定義
 */

import type { UserRole } from '@/lib/supabase/types'
import type { InvitationCode } from '@/lib/utils/code-generator'

// 新しい招待システムの型定義をエクスポート
export type {
  CreateInvitationParams,
  InvitationRecord,
  InvitationDetails as NewInvitationDetails,
  FindInvitationParams,
  RespondToInvitationParams,
  CreateInvitationResult,
  InvitationResponseResult,
  InvitationError,
  InvitationResponse,
  InvitationStats,
  InvitationFilter,
  InvitationListResult,
} from './invitation'

// 8桁コード型もエクスポート
export type { InvitationCode } from '@/lib/utils/code-generator'

/**
 * 招待ステータス
 */
export type InvitationStatus = 'pending' | 'accepted' | 'rejected' | 'expired'

/**
 * ペアステータス
 */
export type PairStatus = 'pending' | 'approved' | 'suspended' | 'terminated'

/**
 * 招待情報
 */
export interface Invitation {
  id: string
  inviterId: string
  inviterName: string
  inviterRole: UserRole
  inviteeEmail: string
  targetRole: UserRole
  token: string
  status: InvitationStatus
  expiresAt: string
  createdAt: string
  updatedAt: string
  // 8桁コード対応
  invitationCode?: InvitationCode
}

/**
 * ペア情報
 */
export interface UserPair {
  id: string
  patientId: string
  supporterId: string
  patientName: string
  supporterName: string
  status: PairStatus
  createdAt: string
  updatedAt: string
}

/**
 * 招待作成フォームデータ
 */
export interface CreateInvitationFormData {
  inviteeEmail: string
  targetRole: UserRole
  message?: string
}

/**
 * 招待レスポンスフォームデータ
 */
export interface InvitationResponseFormData {
  token: string
  action: 'accept' | 'reject'
}

/**
 * ペア管理エラー
 */
export interface PairError {
  code: string
  message: string
  details?: string
}

/**
 * ペア管理APIレスポンス
 */
export interface PairResponse<T = unknown> {
  success: boolean
  data?: T | undefined
  error?: PairError
}

/**
 * 招待状態
 */
export interface InvitationState {
  sentInvitations: Invitation[]
  receivedInvitations: Invitation[]
  isLoading: boolean
  error?: PairError | undefined
}

/**
 * ペア状態
 */
export interface PairState {
  currentPair?: UserPair | undefined
  isLoading: boolean
  error?: PairError | undefined
}

/**
 * 招待詳細（トークン検証用）
 */
export interface InvitationDetails {
  invitation: Invitation
  isValid: boolean
  isExpired: boolean
  alreadyResponded: boolean
}

/**
 * ペア管理コンテキスト状態
 */
export interface PairManagementState {
  invitations: InvitationState
  pairs: PairState
  actions: {
    createInvitation: (
      data: CreateInvitationFormData
    ) => Promise<PairResponse<{ invitationId: string }>>
    respondToInvitation: (
      data: InvitationResponseFormData
    ) => Promise<PairResponse<{ pairId?: string }>>
    cancelInvitation: (invitationId: string) => Promise<PairResponse>
    terminatePair: (pairId: string) => Promise<PairResponse>
    refreshInvitations: () => Promise<void>
    refreshPairs: () => Promise<void>
  }
}
