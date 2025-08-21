/**
 * 招待システム API テスト
 * TDDプロセス: Red-Green-Refactor
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createInvitation, findByCode } from '../api/invitation'
import type { CreateInvitationParams, FindInvitationParams } from '../types/invitation'

// モック設定
vi.mock('@/features/auth/api/auth-service')
vi.mock('@/lib/supabase')
vi.mock('@/lib/utils/code-generator')

// テスト用のモックデータ
const mockUser = {
  id: 'user-123',
  email: 'patient@example.com',
  role: 'patient' as const,
  displayName: 'Patient User',
}

const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
        single: vi.fn(() =>
          Promise.resolve({
            data: {
              id: 'invitation-123',
              inviter_id: 'user-123',
              invitee_email: 'supporter@example.com',
              target_role: 'supporter',
              invitation_code: 'ABC12345',
              status: 'pending',
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              message: null,
            },
            error: null,
          })
        ),
      })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve({
            data: {
              id: 'invitation-123',
              inviter_id: 'user-123',
              invitee_email: 'supporter@example.com',
              target_role: 'supporter',
              invitation_code: 'ABC12345',
              status: 'pending',
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              message: null,
            },
            error: null,
          })
        ),
      })),
    })),
  })),
}

beforeEach(async () => {
  // モックの実装設定
  const { getCurrentUser } = await import('@/features/auth/api/auth-service')
  const { getSupabaseClient } = await import('@/lib/supabase')
  const { generateInvitationCode, validateInvitationCode } = await import(
    '@/lib/utils/code-generator'
  )

  vi.mocked(getCurrentUser).mockResolvedValue(mockUser)
  vi.mocked(getSupabaseClient).mockReturnValue(mockSupabaseClient as never)
  vi.mocked(generateInvitationCode).mockResolvedValue({
    code: 'ABC12345' as never,
    attempts: 1,
    generatedAt: new Date(),
  })
  vi.mocked(validateInvitationCode).mockImplementation((code: unknown): code is never => {
    return typeof code === 'string' && /^[A-Z0-9]{8}$/.test(code)
  })

  // 環境変数のモック
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('invitation.ts API', () => {
  describe('createInvitation', () => {
    test('有効な招待作成パラメータで招待を作成できる', async () => {
      const params: CreateInvitationParams = {
        inviterId: 'user-123',
        inviteeEmail: 'supporter@example.com',
        targetRole: 'supporter',
        message: 'よろしくお願いします',
      }

      const result = await createInvitation(params)

      expect(result).toBeDefined()
      expect(result.invitation).toBeDefined()
      expect(result.invitation.invitationCode).toMatch(/^[A-Z0-9]{8}$/)
      expect(result.invitation.inviteeEmail).toBe(params.inviteeEmail)
      expect(result.invitation.targetRole).toBe(params.targetRole)
      expect(result.invitation.status).toBe('pending')
      expect(result.invitation.expiresAt).toBeInstanceOf(Date)
      expect(result.invitationUrl).toContain('http://localhost:3000/invitation?code=')
      expect(result.qrCodeData).toContain('invitation:')
    })

    test('自分自身を招待しようとするとエラーになる', async () => {
      const params: CreateInvitationParams = {
        inviterId: 'user-123',
        inviteeEmail: 'patient@example.com', // 同じメールアドレス
        targetRole: 'supporter',
      }

      await expect(createInvitation(params)).rejects.toThrow('自分自身を招待することはできません')
    })

    test('無効なロール組み合わせでエラーになる', async () => {
      // モックユーザーをsupporterに変更
      const { getCurrentUser } = await import('@/features/auth/api/auth-service')
      vi.mocked(getCurrentUser)
      getCurrentUser.mockResolvedValueOnce({
        ...mockUser,
        role: 'supporter',
      })

      const params: CreateInvitationParams = {
        inviterId: 'user-123',
        inviteeEmail: 'other-supporter@example.com',
        targetRole: 'supporter', // supporter -> supporterは無効
      }

      await expect(createInvitation(params)).rejects.toThrow('患者と支援者の組み合わせのみ可能です')
    })

    test('認証されていない場合はエラーになる', async () => {
      const { getCurrentUser } = await import('@/features/auth/api/auth-service')
      vi.mocked(getCurrentUser)
      getCurrentUser.mockResolvedValueOnce(null)

      const params: CreateInvitationParams = {
        inviterId: 'user-123',
        inviteeEmail: 'supporter@example.com',
        targetRole: 'supporter',
      }

      await expect(createInvitation(params)).rejects.toThrow('認証が必要です')
    })

    test('招待コード生成に失敗した場合はエラーになる', async () => {
      const { generateInvitationCode } = await import('@/lib/utils/code-generator')
      vi.mocked(generateInvitationCode)
      generateInvitationCode.mockRejectedValueOnce(new Error('Generation failed'))

      const params: CreateInvitationParams = {
        inviterId: 'user-123',
        inviteeEmail: 'supporter@example.com',
        targetRole: 'supporter',
      }

      await expect(createInvitation(params)).rejects.toThrow('Generation failed')
    })
  })

  describe('findByCode', () => {
    test('有効な招待コードで招待詳細を取得できる', async () => {
      // モックデータに招待者情報を追加
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'invitation-123',
          inviter_id: 'user-456',
          invitee_email: 'supporter@example.com',
          target_role: 'supporter',
          invitation_code: 'ABC12345',
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          message: 'よろしくお願いします',
          users: {
            id: 'user-456',
            display_name: 'Inviter User',
            email: 'inviter@example.com',
            role: 'patient',
          },
        },
        error: null,
      })

      // モックSupabaseクライアントを再設定
      const { getSupabaseClient } = await import('@/lib/supabase')
      vi.mocked(getSupabaseClient).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: mockMaybeSingle,
            })),
          })),
        })),
      } as never)

      const params: FindInvitationParams = {
        code: 'ABC12345' as never,
      }

      const result = await findByCode(params)

      expect(result).toBeDefined()
      expect(result?.invitationCode).toBe('ABC12345')
      expect(result?.inviteeEmail).toBe('supporter@example.com')
      expect(result?.targetRole).toBe('supporter')
      expect(result?.status).toBe('pending')
      expect(result?.isValid).toBe(true)
      expect(result?.isExpired).toBe(false)
      expect(result?.isResponded).toBe(false)
      expect(result?.inviter).toBeDefined()
      expect(result?.inviter.name).toBe('Inviter User')
      expect(result?.inviter.email).toBe('inviter@example.com')
      expect(result?.inviter.role).toBe('patient')
      expect(result?.timeToExpiry).toBeGreaterThan(0)
    })

    test('無効な招待コード形式でnullを返す', async () => {
      const params: FindInvitationParams = {
        code: 'invalid-code' as never,
      }

      const result = await findByCode(params)

      expect(result).toBeNull()
    })

    test('存在しない招待コードでnullを返す', async () => {
      mockSupabaseClient.from().select().eq().maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      })

      const params: FindInvitationParams = {
        code: 'NOTFOUND1' as never,
      }

      const result = await findByCode(params)

      expect(result).toBeNull()
    })

    test('期限切れの招待を正しく判定する', async () => {
      // 期限切れの招待データ
      const mockMaybeSingleExpired = vi.fn().mockResolvedValue({
        data: {
          id: 'invitation-expired',
          inviter_id: 'user-456',
          invitee_email: 'supporter@example.com',
          target_role: 'supporter',
          invitation_code: 'EXPIRED1',
          status: 'pending',
          expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1日前
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          message: null,
          users: {
            id: 'user-456',
            display_name: 'Inviter User',
            email: 'inviter@example.com',
            role: 'patient',
          },
        },
        error: null,
      })

      // モックSupabaseクライアントを再設定
      const { getSupabaseClient } = await import('@/lib/supabase')
      vi.mocked(getSupabaseClient).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: mockMaybeSingleExpired,
            })),
          })),
        })),
      } as never)

      const params: FindInvitationParams = {
        code: 'EXPIRED1' as never,
      }

      const result = await findByCode(params)

      expect(result).toBeDefined()
      expect(result?.isExpired).toBe(true)
      expect(result?.isValid).toBe(false)
      expect(result?.timeToExpiry).toBe(0)
    })

    test('メールアドレス検証で権限のない招待にアクセスするとnullを返す', async () => {
      mockSupabaseClient
        .from()
        .select()
        .eq()
        .maybeSingle.mockResolvedValueOnce({
          data: {
            id: 'invitation-123',
            inviter_id: 'user-456',
            invitee_email: 'different@example.com',
            target_role: 'supporter',
            invitation_code: 'ABC12345',
            status: 'pending',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            message: null,
            users: {
              id: 'user-456',
              display_name: 'Inviter User',
              email: 'inviter@example.com',
              role: 'patient',
            },
          },
          error: null,
        })

      const params: FindInvitationParams = {
        code: 'ABC12345' as never,
        inviteeEmail: 'wrong@example.com', // 異なるメールアドレス
      }

      const result = await findByCode(params)

      expect(result).toBeNull()
    })
  })
})
