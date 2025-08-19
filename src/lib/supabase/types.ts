/**
 * Supabase型定義
 * Supabase CLI生成の型定義をラップし、プロジェクト固有の型を定義
 */

/**
 * データベース型定義（後でSupabase CLI生成で置き換え）
 */
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          role: 'patient' | 'supporter'
          display_name: string | null
          phone_number: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          role: 'patient' | 'supporter'
          display_name?: string | null
          phone_number?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: 'patient' | 'supporter'
          display_name?: string | null
          phone_number?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_pairs: {
        Row: {
          id: string
          patient_id: string
          supporter_id: string
          status: 'pending' | 'approved' | 'rejected'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          supporter_id: string
          status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          supporter_id?: string
          status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
          updated_at?: string
        }
      }
      invitations: {
        Row: {
          id: string
          inviter_id: string
          invitee_email: string
          token: string
          role: 'patient' | 'supporter'
          status: 'pending' | 'accepted' | 'expired'
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          inviter_id: string
          invitee_email: string
          token: string
          role: 'patient' | 'supporter'
          status?: 'pending' | 'accepted' | 'expired'
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          inviter_id?: string
          invitee_email?: string
          token?: string
          role?: 'patient' | 'supporter'
          status?: 'pending' | 'accepted' | 'expired'
          expires_at?: string
          created_at?: string
        }
      }
    }
  }
}

/**
 * 型安全なテーブル型取得
 */
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]

export type Row<T extends keyof Database['public']['Tables']> = Tables<T>['Row']

export type Insert<T extends keyof Database['public']['Tables']> = Tables<T>['Insert']

export type Update<T extends keyof Database['public']['Tables']> = Tables<T>['Update']

/**
 * エンティティ型定義
 */
export type User = Row<'users'>
export type UserPair = Row<'user_pairs'>
export type Invitation = Row<'invitations'>

export type UserRole = User['role']
export type PairStatus = UserPair['status']
export type InvitationStatus = Invitation['status']

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
