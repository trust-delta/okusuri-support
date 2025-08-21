/**
 * 招待システム API
 * 双方向招待・8桁コード生成実装
 */

import { getCurrentUser } from '@/features/auth/api/auth-service'
import { getSupabaseClient } from '@/lib/supabase'
import {
  type InvitationCode,
  generateInvitationCode,
  validateInvitationCode,
} from '@/utils/code-generator'
import type {
  CreateInvitationParams,
  CreateInvitationResult,
  FindInvitationParams,
  InvitationDetails,
  InvitationError,
  InvitationRecord,
} from '../types/invitation'

/**
 * Supabaseエラーを招待エラー形式に変換
 */
function transformError(error: unknown): InvitationError {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const supabaseError = error as { message: string; code?: string }

    // エラーパターンの日本語化
    const errorMessages: Record<string, InvitationError['code']> = {
      'duplicate key value violates unique constraint': 'DUPLICATE_PAIR',
      'violates check constraint': 'VALIDATION_FAILED',
      'invitation not found': 'INVITATION_NOT_FOUND',
      'invitation expired': 'INVITATION_EXPIRED',
      'invitation already responded': 'INVITATION_ALREADY_RESPONDED',
    }

    const errorCode =
      Object.entries(errorMessages).find(([pattern]) =>
        supabaseError.message.includes(pattern)
      )?.[1] || 'VALIDATION_FAILED'

    return {
      code: errorCode,
      message: supabaseError.message,
      details: supabaseError.message,
    }
  }

  return {
    code: 'VALIDATION_FAILED',
    message: '予期しないエラーが発生しました',
    details: String(error),
  }
}

/**
 * 重複チェック関数（DB内でのコード重複確認）
 */
async function checkCodeDuplicate(code: string): Promise<boolean> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('invitations')
    .select('id')
    .eq('invitation_code', code)
    .maybeSingle()

  if (error) {
    console.warn('コード重複チェック中にエラー:', error)
    return false
  }

  return data !== null
}

/**
 * 招待作成
 */
export async function createInvitation(
  params: CreateInvitationParams
): Promise<CreateInvitationResult> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      throw new Error('認証が必要です')
    }

    // 自分自身を招待することはできない
    if (currentUser.email === params.inviteeEmail) {
      throw new Error('自分自身を招待することはできません')
    }

    // ロールの組み合わせチェック（患者-支援者の組み合わせのみ許可）
    const isValidRoleCombination =
      (currentUser.role === 'patient' && params.targetRole === 'supporter') ||
      (currentUser.role === 'supporter' && params.targetRole === 'patient')

    if (!isValidRoleCombination) {
      throw new Error('患者と支援者の組み合わせのみ可能です')
    }

    // セキュアな8桁コード生成
    const codeResult = await generateInvitationCode(checkCodeDuplicate)

    const supabase = getSupabaseClient()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7日後

    const { data: invitation, error } = await supabase
      .from('invitations')
      .insert({
        inviter_id: currentUser.id,
        invitee_email: params.inviteeEmail,
        target_role: params.targetRole,
        invitation_code: codeResult.code,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        message: params.message || null,
      })
      .select(
        `
        id,
        inviter_id,
        invitee_email,
        target_role,
        invitation_code,
        status,
        expires_at,
        created_at,
        updated_at,
        message
      `
      )
      .single()

    if (error) {
      throw transformError(error)
    }

    const record: InvitationRecord = {
      id: invitation.id,
      inviterId: invitation.inviter_id,
      inviteeEmail: invitation.invitee_email,
      targetRole: invitation.target_role,
      invitationCode: invitation.invitation_code as InvitationCode,
      status: invitation.status,
      expiresAt: new Date(invitation.expires_at),
      createdAt: new Date(invitation.created_at),
      updatedAt: new Date(invitation.updated_at),
      message: invitation.message,
    }

    // 招待URL生成（プレースホルダー）
    const baseUrl = process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3000'
    const invitationUrl = `${baseUrl}/invitation?code=${codeResult.code}`
    const qrCodeData = `invitation:${codeResult.code}:${params.inviteeEmail}`

    return {
      invitation: record,
      invitationUrl,
      qrCodeData,
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message)
    }
    throw transformError(error)
  }
}

/**
 * 招待コードで招待検索
 */
export async function findByCode(params: FindInvitationParams): Promise<InvitationDetails | null> {
  try {
    // コード形式の検証
    if (!validateInvitationCode(params.code)) {
      return null
    }

    const supabase = getSupabaseClient()
    const { data: invitation, error } = await supabase
      .from('invitations')
      .select(
        `
        id,
        inviter_id,
        invitee_email,
        target_role,
        invitation_code,
        status,
        expires_at,
        created_at,
        updated_at,
        message,
        users!inviter_id (
          id,
          display_name,
          email,
          role
        )
      `
      )
      .eq('invitation_code', params.code)
      .maybeSingle()

    if (error || !invitation) {
      return null
    }

    // 追加検証（メールアドレスが一致する場合）
    if (params.inviteeEmail && invitation.invitee_email !== params.inviteeEmail) {
      return null
    }

    const now = new Date()
    const expiresAt = new Date(invitation.expires_at)
    const isExpired = now > expiresAt
    const isResponded = invitation.status !== 'pending'
    const isValid = !isExpired && !isResponded
    const timeToExpiry = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000))

    const inviterInfo = invitation.users as unknown as {
      id: string
      display_name?: string
      email: string
      role: string
    }

    const record: InvitationRecord = {
      id: invitation.id,
      inviterId: invitation.inviter_id,
      inviteeEmail: invitation.invitee_email,
      targetRole: invitation.target_role,
      invitationCode: invitation.invitation_code as InvitationCode,
      status: invitation.status,
      expiresAt,
      createdAt: new Date(invitation.created_at),
      updatedAt: new Date(invitation.updated_at),
      message: invitation.message,
    }

    const details: InvitationDetails = {
      ...record,
      inviter: {
        id: inviterInfo.id,
        name: inviterInfo.display_name || inviterInfo.email,
        email: inviterInfo.email,
        role: inviterInfo.role as 'patient' | 'supporter',
      },
      isExpired,
      isResponded,
      isValid,
      timeToExpiry,
    }

    return details
  } catch (error) {
    console.warn('招待検索中にエラー:', error)
    return null
  }
}
