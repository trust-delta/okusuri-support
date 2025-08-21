/**
 * 招待システムの型定義
 * 双方向招待・8桁招待コードシステム対応
 */

import type { UserRole } from '@/lib/supabase/types'
import type { InvitationCode } from '@/utils/code-generator'

/**
 * 招待作成パラメータ
 */
export interface CreateInvitationParams {
  /** 招待者ID */
  inviterId: string
  /** 被招待者メールアドレス */
  inviteeEmail: string
  /** 被招待者の希望役割 */
  targetRole: UserRole
  /** 招待メッセージ（任意） */
  message?: string
}

/**
 * 招待情報（データベース格納用）
 */
export interface InvitationRecord {
  /** 招待ID */
  id: string
  /** 招待者ID */
  inviterId: string
  /** 被招待者メールアドレス */
  inviteeEmail: string
  /** 被招待者の希望役割 */
  targetRole: UserRole
  /** 8桁招待コード */
  invitationCode: InvitationCode
  /** ステータス */
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
  /** 有効期限（UTC） */
  expiresAt: Date
  /** 作成日時（UTC） */
  createdAt: Date
  /** 更新日時（UTC） */
  updatedAt: Date
  /** 招待メッセージ */
  message: string | null
}

/**
 * 招待詳細情報（UI表示用）
 */
export interface InvitationDetails extends InvitationRecord {
  /** 招待者情報 */
  inviter: {
    id: string
    name: string
    email: string
    role: UserRole
  }
  /** 有効期限チェック結果 */
  isExpired: boolean
  /** 応答済みかどうか */
  isResponded: boolean
  /** 招待が有効かどうか */
  isValid: boolean
  /** 有効期限までの残り時間（秒） */
  timeToExpiry: number
}

/**
 * 招待検索パラメータ
 */
export interface FindInvitationParams {
  /** 招待コード */
  code: InvitationCode
  /** 被招待者メール（任意・検証強化用） */
  inviteeEmail?: string
}

/**
 * 招待応答パラメータ
 */
export interface RespondToInvitationParams {
  /** 招待コード */
  invitationCode: InvitationCode
  /** 応答アクション */
  action: 'accept' | 'reject'
  /** 被招待者メールアドレス（検証用） */
  inviteeEmail: string
}

/**
 * 招待作成結果
 */
export interface CreateInvitationResult {
  /** 作成された招待情報 */
  invitation: InvitationRecord
  /** 招待URL（共有用） */
  invitationUrl: string
  /** QRコード生成用データ */
  qrCodeData: string
}

/**
 * 招待応答結果
 */
export interface InvitationResponseResult {
  /** 応答が成功したかどうか */
  success: boolean
  /** 承認の場合に作成されたペアID */
  pairId?: string
  /** 更新後の招待情報 */
  invitation: InvitationRecord
}

/**
 * 招待システムエラー
 */
export interface InvitationError {
  /** エラーコード */
  code:
    | 'INVITATION_NOT_FOUND'
    | 'INVITATION_EXPIRED'
    | 'INVITATION_ALREADY_RESPONDED'
    | 'INVALID_EMAIL'
    | 'INVALID_CODE'
    | 'UNAUTHORIZED'
    | 'DUPLICATE_PAIR'
    | 'GENERATION_FAILED'
    | 'VALIDATION_FAILED'
  /** エラーメッセージ */
  message: string
  /** 詳細情報 */
  details?: string
}

/**
 * 招待システムAPIレスポンス
 */
export interface InvitationResponse<T = unknown> {
  /** 成功フラグ */
  success: boolean
  /** レスポンスデータ */
  data?: T
  /** エラー情報 */
  error?: InvitationError
}

/**
 * 招待統計情報
 */
export interface InvitationStats {
  /** 送信した招待数 */
  sentCount: number
  /** 受信した招待数 */
  receivedCount: number
  /** 承認された招待数 */
  acceptedCount: number
  /** 期限切れ招待数 */
  expiredCount: number
  /** 本日作成された招待数 */
  todayCreatedCount: number
}

/**
 * 招待フィルター条件
 */
export interface InvitationFilter {
  /** ステータスフィルター */
  status?: InvitationRecord['status'][]
  /** 作成日開始 */
  createdFrom?: Date
  /** 作成日終了 */
  createdTo?: Date
  /** 検索キーワード（メールアドレス・メッセージ） */
  searchQuery?: string
  /** ページネーション */
  pagination?: {
    page: number
    limit: number
  }
}

/**
 * 招待一覧結果
 */
export interface InvitationListResult {
  /** 招待一覧 */
  invitations: InvitationDetails[]
  /** 総件数 */
  totalCount: number
  /** ページ情報 */
  pagination: {
    currentPage: number
    totalPages: number
    hasNext: boolean
    hasPrevious: boolean
  }
  /** 統計情報 */
  stats: InvitationStats
}
