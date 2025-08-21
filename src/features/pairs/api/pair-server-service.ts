/**
 * ペア管理API サーバーサイド専用サービス
 * Server Components、API Routes専用
 */

import { getCurrentUserServer } from '@/features/auth/api/auth-server-service'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { PairResponse, UserPair } from '../types'

/**
 * サーバーサイド用：現在のペア情報取得
 */
export async function getCurrentPairServer(): Promise<PairResponse<UserPair>> {
  try {
    const currentUser = await getCurrentUserServer()
    if (!currentUser) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'ログインが必要です',
        },
      }
    }

    const supabase = await createServerSupabaseClient()
    const { data: pair, error } = await supabase
      .from('user_pairs')
      .select(
        `
        id,
        patient_id,
        supporter_id,
        status,
        created_at,
        updated_at,
        patient:users!patient_id (id, name, role),
        supporter:users!supporter_id (id, name, role)
      `
      )
      .or(`patient_id.eq.${currentUser.id},supporter_id.eq.${currentUser.id}`)
      .eq('status', 'approved')
      .single()

    if (error || !pair) {
      return {
        success: false,
        error: {
          code: 'PAIR_NOT_FOUND',
          message: 'ペアが見つかりません',
        },
      }
    }

    const transformedPair: UserPair = {
      id: pair.id,
      patientId: pair.patient_id,
      supporterId: pair.supporter_id,
      patientName: (pair.patient as { name?: string })?.name || '不明',
      supporterName: (pair.supporter as { name?: string })?.name || '不明',
      status: pair.status as 'pending' | 'approved' | 'suspended' | 'terminated',
      createdAt: pair.created_at,
      updatedAt: pair.updated_at,
    }

    return {
      success: true,
      data: transformedPair,
    }
  } catch (error) {
    console.error('サーバーサイドペア取得エラー:', error)
    return {
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'サーバーエラーが発生しました',
      },
    }
  }
}
