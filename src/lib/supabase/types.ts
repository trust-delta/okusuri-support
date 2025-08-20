/**
 * Supabase型定義
 * Supabase CLI自動生成の型定義をラップし、プロジェクト固有の型を定義
 */

// Supabase CLI自動生成型をインポート
export type { Database, Tables, TablesInsert, TablesUpdate, Enums } from './database.generated'

// 生成された型からDatabase型をインポート
import type { Database } from './database.generated'

/**
 * 型安全なテーブル型取得ユーティリティ
 */
export type Row<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type Insert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type Update<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

/**
 * エンティティ型定義 - 各テーブルのRow型から派生
 */
export type User = Row<'users'>
export type UserPair = Row<'user_pairs'>
export type Invitation = Row<'invitations'>

/**
 * Enum型定義 - 生成されたDatabase型のEnumから派生
 */
export type UserRole = Database['public']['Enums']['user_role']
export type PairStatus = Database['public']['Enums']['pair_status']
export type InvitationStatus = Database['public']['Enums']['invitation_status']

/**
 * 認証関連の型定義
 */
export interface AuthUser {
  id: string
  email: string
  role: UserRole
  displayName?: string | null
  phoneNumber?: string | null
}

export interface AuthSession {
  user: AuthUser
  accessToken: string
  refreshToken: string
  expiresAt: number
}

/**
 * 型安全なヘルパー型 - 部分更新用
 */
export type UserUpdate = Update<'users'>
export type UserPairUpdate = Update<'user_pairs'>
export type InvitationUpdate = Update<'invitations'>

export type UserInsert = Insert<'users'>
export type UserPairInsert = Insert<'user_pairs'>
export type InvitationInsert = Insert<'invitations'>

/**
 * 型安全なデータアクセス用型定義
 */

/**
 * クエリオプション型 - 型安全なクエリビルダー用
 */
export interface QueryOptions<T extends keyof Database['public']['Tables']> {
  select?: string
  limit?: number
  offset?: number
  orderBy?: {
    column: keyof Database['public']['Tables'][T]['Row']
    ascending?: boolean
  }
}

/**
 * ユーザー検索フィルター型
 */
export interface UserFilters {
  role?: UserRole
  email?: string
  display_name?: string
}

/**
 * ペア検索フィルター型
 */
export interface UserPairFilters {
  status?: PairStatus
  patient_id?: string
  supporter_id?: string
}

/**
 * 招待検索フィルター型
 */
export interface InvitationFilters {
  status?: InvitationStatus
  inviter_id?: string
  invitee_email?: string
  role?: UserRole
}

/**
 * ページネーション結果型
 */
export interface PaginatedResult<T> {
  data: T[]
  count: number | null
  hasMore: boolean
  page: number
  pageSize: number
}

/**
 * データアクセスAPI結果型 - Result型パターン
 */
export type DataResult<T, E = Error> = { success: true; data: T } | { success: false; error: E }

/**
 * よく使用される組み合わせ型
 */
export interface UserWithPairs extends User {
  user_pairs: UserPair[]
}

export interface InvitationWithInviter extends Invitation {
  inviter: User
}

/**
 * 型安全なユーティリティ型 - 部分更新・条件分岐用
 */

/**
 * オプショナルフィールドのみを抽出
 */
export type OptionalFields<T> = {
  [K in keyof T as T[K] extends undefined ? K : never]: T[K]
}

/**
 * 必須フィールドのみを抽出
 */
export type RequiredFields<T> = {
  [K in keyof T as T[K] extends undefined ? never : K]: T[K]
}

/**
 * 特定のフィールドを必須にする
 */
export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>

/**
 * 型安全なフィールド選択
 */
export type SelectFields<T, K extends keyof T> = Pick<T, K>

/**
 * よく使われるユーザー情報の組み合わせ
 */
export type UserProfile = SelectFields<User, 'id' | 'email' | 'display_name' | 'role'>
export type UserBasicInfo = SelectFields<User, 'id' | 'display_name' | 'role'>

/**
 * 認証関連のユーティリティ型
 */
export type PatientUser = User & { role: 'patient' }
export type SupporterUser = User & { role: 'supporter' }

/**
 * ペア関係の状態別型
 */
export type PendingPair = UserPair & { status: 'pending' }
export type ApprovedPair = UserPair & { status: 'approved' }
export type RejectedPair = UserPair & { status: 'rejected' }

/**
 * 招待の状態別型
 */
export type PendingInvitation = Invitation & { status: 'pending' }
export type AcceptedInvitation = Invitation & { status: 'accepted' }
export type ExpiredInvitation = Invitation & { status: 'expired' }

/**
 * API応答の型ガード用型
 */
export interface DatabaseError {
  message: string
  code: string
  details?: string
  hint?: string
}

/**
 * バリデーション用の型定義
 */
export interface ValidationRule<T> {
  field: keyof T
  rule: (value: T[keyof T]) => boolean
  message: string
}

export type ValidationErrors<T> = Partial<Record<keyof T, string[]>>
