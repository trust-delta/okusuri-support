/**
 * ペア管理API サービス層
 * Supabaseペア管理機能のラッパー
 */

import { createServerSupabaseClient, getSupabaseClient } from '@/lib/supabase'
import type {
  CreateInvitationFormData,
  Invitation,
  InvitationDetails,
  InvitationResponseFormData,
  PairError,
  PairResponse,
  UserPair,
} from '../types'
import { getCurrentUser, getCurrentUserServer } from '@/features/auth/api/auth-service'

/**
 * Supabaseエラーを統一エラー形式に変換
 */
function transformSupabaseError(error: unknown): PairError {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const supabaseError = error as { message: string; code?: string }
    
    // よくあるエラーパターンの日本語化
    const errorMessages: Record<string, string> = {
      'duplicate key value violates unique constraint': 'この組み合わせは既に存在します',
      'violates check constraint "check_different_users"': '同じユーザーを招待することはできません',
      'violates check constraint "check_single_patient_per_supporter"': 'この支援者は既にペアを組んでいます',
      'violates check constraint "check_single_supporter_per_patient"': 'この患者は既にペアを組んでいます',
      'invitation not found': '招待が見つかりません',
      'invitation expired': '招待の有効期限が切れています',
      'invitation already responded': 'この招待には既に応答済みです',
      'user not found': '指定されたユーザーが見つかりません',
    }

    return {
      code: supabaseError.code || 'PAIR_ERROR',
      message: errorMessages[supabaseError.message] || supabaseError.message,
      details: supabaseError.message,
    }
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: '予期しないエラーが発生しました',
    details: String(error),
  }
}

/**
 * ユニークな招待トークン生成
 */
function generateInvitationToken(): string {
  return `invitation_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

/**
 * 招待作成
 */
export async function createInvitation(formData: CreateInvitationFormData): Promise<PairResponse<{ invitationId: string }>> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'ログインが必要です',
        },
      }
    }

    // 自分自身を招待することはできない
    if (currentUser.email === formData.inviteeEmail) {
      return {
        success: false,
        error: {
          code: 'SELF_INVITATION',
          message: '自分自身を招待することはできません',
        },
      }
    }

    // ロールの組み合わせチェック（患者-支援者の組み合わせのみ許可）
    const isValidRoleCombination = 
      (currentUser.role === 'patient' && formData.targetRole === 'supporter') ||
      (currentUser.role === 'supporter' && formData.targetRole === 'patient')
    
    if (!isValidRoleCombination) {
      return {
        success: false,
        error: {
          code: 'INVALID_ROLE_COMBINATION',
          message: '患者と支援者の組み合わせのみ可能です',
        },
      }
    }

    const supabase = getSupabaseClient()
    const token = generateInvitationToken()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7日後

    const { data: invitation, error } = await supabase
      .from('invitations')
      .insert({
        inviter_id: currentUser.id,
        invitee_email: formData.inviteeEmail,
        role: formData.targetRole,
        token,
        expires_at: expiresAt.toISOString(),
        message: formData.message || null,
      })
      .select('id')
      .single()

    if (error) {
      return {
        success: false,
        error: transformSupabaseError(error),
      }
    }

    return {
      success: true,
      data: { invitationId: invitation.id },
    }
  } catch (error) {
    return {
      success: false,
      error: transformSupabaseError(error),
    }
  }
}

/**
 * 送信した招待一覧取得
 */
export async function getSentInvitations(): Promise<PairResponse<Invitation[]>> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'ログインが必要です',
        },
      }
    }

    const supabase = getSupabaseClient()
    const { data: invitations, error } = await supabase
      .from('invitations')
      .select(`
        id,
        invitee_email,
        role,
        token,
        status,
        expires_at,
        created_at,
        updated_at,
        message
      `)
      .eq('inviter_id', currentUser.id)
      .order('created_at', { ascending: false })

    if (error) {
      return {
        success: false,
        error: transformSupabaseError(error),
      }
    }

    const transformedInvitations: Invitation[] = invitations.map(inv => ({
      id: inv.id,
      inviterId: currentUser.id,
      inviterName: currentUser.displayName || currentUser.email,
      inviterRole: currentUser.role,
      inviteeEmail: inv.invitee_email,
      targetRole: inv.role,
      token: inv.token,
      status: inv.status,
      expiresAt: inv.expires_at,
      createdAt: inv.created_at,
      updatedAt: inv.updated_at,
    }))

    return {
      success: true,
      data: transformedInvitations,
    }
  } catch (error) {
    return {
      success: false,
      error: transformSupabaseError(error),
    }
  }
}

/**
 * 受信した招待一覧取得
 */
export async function getReceivedInvitations(): Promise<PairResponse<Invitation[]>> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'ログインが必要です',
        },
      }
    }

    const supabase = getSupabaseClient()
    const { data: invitations, error } = await supabase
      .from('invitations')
      .select(`
        id,
        inviter_id,
        role,
        token,
        status,
        expires_at,
        created_at,
        updated_at,
        message,
        users!inviter_id (
          display_name,
          email,
          role
        )
      `)
      .eq('invitee_email', currentUser.email)
      .order('created_at', { ascending: false })

    if (error) {
      return {
        success: false,
        error: transformSupabaseError(error),
      }
    }

    const transformedInvitations: Invitation[] = invitations.map(inv => ({
      id: inv.id,
      inviterId: inv.inviter_id,
      inviterName: (inv.users as { display_name?: string; email?: string })?.display_name || (inv.users as { display_name?: string; email?: string })?.email || '不明',
      inviterRole: (inv.users as { role?: string })?.role as 'patient' | 'supporter' || 'patient',
      inviteeEmail: currentUser.email,
      targetRole: inv.role,
      token: inv.token,
      status: inv.status,
      expiresAt: inv.expires_at,
      createdAt: inv.created_at,
      updatedAt: inv.updated_at,
    }))

    return {
      success: true,
      data: transformedInvitations,
    }
  } catch (error) {
    return {
      success: false,
      error: transformSupabaseError(error),
    }
  }
}

/**
 * 招待トークン検証と詳細取得
 */
export async function getInvitationByToken(token: string): Promise<PairResponse<InvitationDetails>> {
  try {
    const supabase = getSupabaseClient()
    const { data: invitation, error } = await supabase
      .from('invitations')
      .select(`
        id,
        inviter_id,
        invitee_email,
        role,
        token,
        status,
        expires_at,
        created_at,
        updated_at,
        message,
        users!inviter_id (
          display_name,
          email,
          role
        )
      `)
      .eq('token', token)
      .single()

    if (error) {
      return {
        success: false,
        error: transformSupabaseError(error),
      }
    }

    const now = new Date()
    const expiresAt = new Date(invitation.expires_at)
    const isExpired = now > expiresAt
    const alreadyResponded = invitation.status !== 'pending'
    const isValid = !isExpired && !alreadyResponded

    const transformedInvitation: Invitation = {
      id: invitation.id,
      inviterId: invitation.inviter_id,
      inviterName: (invitation.users as { display_name?: string; email?: string })?.display_name || (invitation.users as { display_name?: string; email?: string })?.email || '不明',
      inviterRole: (invitation.users as { role?: string })?.role as 'patient' | 'supporter' || 'patient',
      inviteeEmail: invitation.invitee_email,
      targetRole: invitation.role,
      token: invitation.token,
      status: invitation.status,
      expiresAt: invitation.expires_at,
      createdAt: invitation.created_at,
      updatedAt: invitation.updated_at,
    }

    return {
      success: true,
      data: {
        invitation: transformedInvitation,
        isValid,
        isExpired,
        alreadyResponded,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: transformSupabaseError(error),
    }
  }
}

/**
 * 招待への応答（承認・拒否）
 */
export async function respondToInvitation(formData: InvitationResponseFormData): Promise<PairResponse<{ pairId?: string }>> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'ログインが必要です',
        },
      }
    }

    // 招待詳細取得と検証
    const invitationResult = await getInvitationByToken(formData.token)
    if (!invitationResult.success || !invitationResult.data) {
      return {
        success: false,
        error: invitationResult.error || { code: 'INVITATION_NOT_FOUND', message: '招待が見つかりません' },
      }
    }

    const { invitation, isValid } = invitationResult.data
    if (!isValid) {
      return {
        success: false,
        error: {
          code: 'INVITATION_INVALID',
          message: 'この招待は無効です',
        },
      }
    }

    // 招待対象ユーザーのメールアドレス確認
    if (currentUser.email !== invitation.inviteeEmail) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED_RESPONSE',
          message: 'この招待に応答する権限がありません',
        },
      }
    }

    const supabase = getSupabaseClient()

    if (formData.action === 'reject') {
      // 拒否の場合
      const { error } = await supabase
        .from('invitations')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString(),
        })
        .eq('token', formData.token)

      if (error) {
        return {
          success: false,
          error: transformSupabaseError(error),
        }
      }

      return {
        success: true,
        data: {},
      }
    } else {
      // 承認の場合 - ペア作成
      const patientId = invitation.targetRole === 'patient' ? currentUser.id : invitation.inviterId
      const supporterId = invitation.targetRole === 'supporter' ? currentUser.id : invitation.inviterId

      // トランザクションでペア作成と招待更新を実行
      const { data: pair, error: pairError } = await supabase
        .from('user_pairs')
        .insert({
          patient_id: patientId,
          supporter_id: supporterId,
          status: 'approved',
        })
        .select('id')
        .single()

      if (pairError) {
        return {
          success: false,
          error: transformSupabaseError(pairError),
        }
      }

      // 招待ステータス更新
      const { error: invitationError } = await supabase
        .from('invitations')
        .update({
          status: 'accepted',
          updated_at: new Date().toISOString(),
        })
        .eq('token', formData.token)

      if (invitationError) {
        // ペア作成は成功したが招待更新に失敗 (無視して続行)
        console.warn('招待ステータス更新に失敗:', invitationError)
      }

      return {
        success: true,
        data: { pairId: pair.id },
      }
    }
  } catch (error) {
    return {
      success: false,
      error: transformSupabaseError(error),
    }
  }
}

/**
 * 招待キャンセル
 */
export async function cancelInvitation(invitationId: string): Promise<PairResponse> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'ログインが必要です',
        },
      }
    }

    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from('invitations')
      .delete()
      .eq('id', invitationId)
      .eq('inviter_id', currentUser.id) // 自分が送信した招待のみキャンセル可能

    if (error) {
      return {
        success: false,
        error: transformSupabaseError(error),
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: transformSupabaseError(error),
    }
  }
}

/**
 * 現在のペア情報取得
 */
export async function getCurrentPair(): Promise<PairResponse<UserPair>> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'ログインが必要です',
        },
      }
    }

    const supabase = getSupabaseClient()
    const { data: pair, error } = await supabase
      .from('user_pairs')
      .select(`
        id,
        patient_id,
        supporter_id,
        status,
        created_at,
        updated_at,
        patient:users!patient_id (display_name, email),
        supporter:users!supporter_id (display_name, email)
      `)
      .or(`patient_id.eq.${currentUser.id},supporter_id.eq.${currentUser.id}`)
      .eq('status', 'approved')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // ペアが見つからない場合
        return {
          success: true,
          data: undefined,
        }
      }
      return {
        success: false,
        error: transformSupabaseError(error),
      }
    }

    const transformedPair: UserPair = {
      id: pair.id,
      patientId: pair.patient_id,
      supporterId: pair.supporter_id,
      patientName: (pair.patient as { display_name?: string; email?: string })?.display_name || (pair.patient as { display_name?: string; email?: string })?.email || '不明',
      supporterName: (pair.supporter as { display_name?: string; email?: string })?.display_name || (pair.supporter as { display_name?: string; email?: string })?.email || '不明',
      status: pair.status,
      createdAt: pair.created_at,
      updatedAt: pair.updated_at,
    }

    return {
      success: true,
      data: transformedPair,
    }
  } catch (error) {
    return {
      success: false,
      error: transformSupabaseError(error),
    }
  }
}

/**
 * ペア終了
 */
export async function terminatePair(pairId: string): Promise<PairResponse> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'ログインが必要です',
        },
      }
    }

    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from('user_pairs')
      .update({
        status: 'terminated',
        updated_at: new Date().toISOString(),
      })
      .eq('id', pairId)
      .or(`patient_id.eq.${currentUser.id},supporter_id.eq.${currentUser.id}`) // 自分が関わるペアのみ

    if (error) {
      return {
        success: false,
        error: transformSupabaseError(error),
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: transformSupabaseError(error),
    }
  }
}

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
      .select(`
        id,
        patient_id,
        supporter_id,
        status,
        created_at,
        updated_at,
        patient:users!patient_id (display_name, email),
        supporter:users!supporter_id (display_name, email)
      `)
      .or(`patient_id.eq.${currentUser.id},supporter_id.eq.${currentUser.id}`)
      .eq('status', 'approved')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // ペアが見つからない場合
        return {
          success: true,
          data: undefined,
        }
      }
      return {
        success: false,
        error: transformSupabaseError(error),
      }
    }

    const transformedPair: UserPair = {
      id: pair.id,
      patientId: pair.patient_id,
      supporterId: pair.supporter_id,
      patientName: (pair.patient as { display_name?: string; email?: string })?.display_name || (pair.patient as { display_name?: string; email?: string })?.email || '不明',
      supporterName: (pair.supporter as { display_name?: string; email?: string })?.display_name || (pair.supporter as { display_name?: string; email?: string })?.email || '不明',
      status: pair.status,
      createdAt: pair.created_at,
      updatedAt: pair.updated_at,
    }

    return {
      success: true,
      data: transformedPair,
    }
  } catch (error) {
    return {
      success: false,
      error: transformSupabaseError(error),
    }
  }
}