import { createClient } from '@supabase/supabase-js'

// データベース型定義（T003で生成される予定だが、T002で仮定義）
interface User {
  id: string
  email: string
  role: 'patient' | 'supporter'
  display_name: string
  current_pair_id: string | null
  created_at: string
  updated_at: string
}

interface UserPair {
  id: string
  patient_id: string
  supporter_id: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
}

interface Invitation {
  id: string
  inviter_id: string
  invitation_code: string
  expires_at: string
  used: boolean
  created_at: string
  updated_at: string
}

// Supabaseクライアントの初期化
// 注意: 実際の環境変数は T001 で設定済み
const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL']
const supabaseAnonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase環境変数が設定されていません')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * データベース操作クラス
 * RLS (Row Level Security) に準拠したデータアクセスを提供
 */
export class DatabaseOperations {
  /**
   * ユーザーIDでユーザー情報を取得
   * RLS: 自分のデータまたは承認済みペアパートナーのデータのみアクセス可能
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      const { data, error } = await supabase.from('users').select('*').eq('id', userId).single()

      if (error) {
        console.error('getUserById error:', error)
        return null
      }

      return data as User
    } catch (error) {
      console.error('getUserById exception:', error)
      return null
    }
  }

  /**
   * ペアIDに関連するユーザーを取得
   * RLS: ペアメンバーのみアクセス可能
   */
  async getUsersByPairId(pairId: string): Promise<User[]> {
    try {
      const { data, error } = await supabase.from('users').select('*').eq('current_pair_id', pairId)

      if (error) {
        console.error('getUsersByPairId error:', error)
        return []
      }

      return data as User[]
    } catch (error) {
      console.error('getUsersByPairId exception:', error)
      return []
    }
  }

  /**
   * ペア情報を取得
   * RLS: ペアメンバー（患者または支援者）のみアクセス可能
   */
  async getPairById(pairId: string): Promise<UserPair | null> {
    try {
      const { data, error } = await supabase
        .from('user_pairs')
        .select('*')
        .eq('id', pairId)
        .single()

      if (error) {
        console.error('getPairById error:', error)
        return null
      }

      return data as UserPair
    } catch (error) {
      console.error('getPairById exception:', error)
      return null
    }
  }

  /**
   * 招待コードで招待情報を取得
   * RLS: 有効な招待（未使用かつ期限内）のみ公開読み取り可能
   */
  async getInvitationByCode(code: string): Promise<Invitation | null> {
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('invitation_code', code)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (error) {
        console.error('getInvitationByCode error:', error)
        return null
      }

      return data as Invitation
    } catch (error) {
      console.error('getInvitationByCode exception:', error)
      return null
    }
  }

  /**
   * ユーザー間のペアデータアクセス権限をチェック
   * RLS: 承認済みペアメンバー間でのみアクセス可能
   */
  async canUserAccessPairData(userId: string, targetUserId: string): Promise<boolean> {
    try {
      // 自分のデータには常にアクセス可能
      if (userId === targetUserId) {
        return true
      }

      // ペア関係の確認
      const { data, error } = await supabase
        .from('user_pairs')
        .select('*')
        .eq('status', 'approved')
        .or(`patient_id.eq.${userId},supporter_id.eq.${userId}`)
        .or(`patient_id.eq.${targetUserId},supporter_id.eq.${targetUserId}`)

      if (error) {
        console.error('canUserAccessPairData error:', error)
        return false
      }

      // 同一ペアに属しているかチェック
      const hasSharedPair = data.some(
        (pair) =>
          (pair.patient_id === userId || pair.supporter_id === userId) &&
          (pair.patient_id === targetUserId || pair.supporter_id === targetUserId)
      )

      return hasSharedPair
    } catch (error) {
      console.error('canUserAccessPairData exception:', error)
      return false
    }
  }

  /**
   * ペア作成（テスト用）
   * 実際の実装ではT010で詳細に実装される予定
   */
  async createPair(patientId: string, supporterId: string): Promise<UserPair | null> {
    // 同一ユーザーチェック（check_different_users制約のテスト）
    if (patientId === supporterId) {
      throw new Error('check_different_users constraint violation')
    }

    const { data, error } = await supabase
      .from('user_pairs')
      .insert({
        patient_id: patientId,
        supporter_id: supporterId,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return data as UserPair
  }

  /**
   * 招待作成（テスト用）
   * 実際の実装ではT012で詳細に実装される予定
   */
  async createInvitation(inviterId: string, code: string): Promise<Invitation | null> {
    const { data, error } = await supabase
      .from('invitations')
      .insert({
        inviter_id: inviterId,
        invitation_code: code,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return data as Invitation
  }
}

// シングルトンインスタンス
export const databaseOperations = new DatabaseOperations()

// 型エクスポート
export type { User, UserPair, Invitation }
