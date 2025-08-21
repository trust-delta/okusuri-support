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
