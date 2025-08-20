/**
 * ペア管理API テスト
 */

import { getCurrentUser } from '@/features/auth/api/auth-service'
import { getSupabaseClient } from '@/lib/supabase'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createInvitation,
  getCurrentPair,
  getReceivedInvitations,
  getSentInvitations,
  terminatePair,
} from '../api/pair-service'
import type { CreateInvitationFormData } from '../types'

// 依存関係のモック
vi.mock('@/features/auth/api/auth-service', () => ({
  getCurrentUser: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: vi.fn(),
}))

// モックされたSupabaseクライアント
const mockSupabase = {
  from: vi.fn(),
}

const mockUserPairsTable = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
}

const mockInvitationsTable = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
}

describe('Pair Service API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(getSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase)
  })

  describe('getCurrentPair', () => {
    it('認証されたユーザーの現在のペア情報を取得できる', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'patient@example.com',
        role: 'patient' as const,
        displayName: '患者テスト',
      }
      const mockPair = {
        id: 'pair-123',
        patient_id: 'user-123',
        supporter_id: 'supporter-456',
        status: 'approved',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        patient: { display_name: '患者テスト', email: 'patient@example.com' },
        supporter: { display_name: '支援者テスト', email: 'supporter@example.com' },
      }
      ;(getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser)
      mockSupabase.from.mockReturnValue(mockUserPairsTable)
      mockUserPairsTable.single.mockResolvedValue({ data: mockPair, error: null })

      // Act
      const result = await getCurrentPair()

      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        id: 'pair-123',
        patientId: 'user-123',
        supporterId: 'supporter-456',
        patientName: '患者テスト',
        supporterName: '支援者テスト',
        status: 'approved',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      })
      expect(mockSupabase.from).toHaveBeenCalledWith('user_pairs')
    })

    it('ペアが存在しない場合はundefinedを返す', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'patient@example.com',
        role: 'patient' as const,
        displayName: '患者テスト',
      }
      ;(getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser)
      mockSupabase.from.mockReturnValue(mockUserPairsTable)
      mockUserPairsTable.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      })

      // Act
      const result = await getCurrentPair()

      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toBeUndefined()
    })

    it('未認証の場合はエラーを返す', async () => {
      // Arrange
      ;(getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(null)

      // Act
      const result = await getCurrentPair()

      // Assert
      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('UNAUTHORIZED')
    })
  })

  describe('createInvitation', () => {
    it('有効な招待データで招待を作成できる', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'patient@example.com',
        role: 'patient' as const,
        displayName: '患者テスト',
      }
      const formData: CreateInvitationFormData = {
        inviteeEmail: 'supporter@example.com',
        targetRole: 'supporter',
        message: 'よろしくお願いします',
      }
      const mockInvitation = { id: 'invitation-123' }
      ;(getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser)
      mockSupabase.from.mockReturnValue(mockInvitationsTable)
      mockInvitationsTable.single.mockResolvedValue({
        data: mockInvitation,
        error: null,
      })

      // Act
      const result = await createInvitation(formData)

      // Assert
      expect(result.success).toBe(true)
      expect(result.data?.invitationId).toBe('invitation-123')
      expect(mockSupabase.from).toHaveBeenCalledWith('invitations')
    })

    it('自分自身を招待しようとした場合はエラーを返す', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'patient@example.com',
        role: 'patient' as const,
        displayName: '患者テスト',
      }
      const formData: CreateInvitationFormData = {
        inviteeEmail: 'patient@example.com', // 同じメールアドレス
        targetRole: 'supporter',
      }
      ;(getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser)

      // Act
      const result = await createInvitation(formData)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('SELF_INVITATION')
    })

    it('無効なロール組み合わせの場合はエラーを返す', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'patient@example.com',
        role: 'patient' as const,
        displayName: '患者テスト',
      }
      const formData: CreateInvitationFormData = {
        inviteeEmail: 'another@example.com',
        targetRole: 'patient', // 患者が患者を招待
      }
      ;(getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser)

      // Act
      const result = await createInvitation(formData)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('INVALID_ROLE_COMBINATION')
    })
  })

  describe('terminatePair', () => {
    it('自分が関わるペアを終了できる', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'patient@example.com',
        role: 'patient' as const,
        displayName: '患者テスト',
      }
      const pairId = 'pair-123'
      ;(getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser)
      mockSupabase.from.mockReturnValue(mockUserPairsTable)
      mockUserPairsTable.or.mockResolvedValue({ error: null })

      // Act
      const result = await terminatePair(pairId)

      // Assert
      expect(result.success).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('user_pairs')
      expect(mockUserPairsTable.update).toHaveBeenCalledWith({
        status: 'terminated',
        updated_at: expect.any(String),
      })
    })

    it('未認証の場合はエラーを返す', async () => {
      // Arrange
      ;(getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(null)

      // Act
      const result = await terminatePair('pair-123')

      // Assert
      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('UNAUTHORIZED')
    })
  })

  describe('getSentInvitations', () => {
    it('送信した招待一覧を取得できる', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'patient@example.com',
        role: 'patient' as const,
        displayName: '患者テスト',
      }
      const mockInvitations = [
        {
          id: 'invitation-123',
          invitee_email: 'supporter@example.com',
          role: 'supporter',
          token: 'token-123',
          status: 'pending',
          expires_at: '2024-12-31T23:59:59Z',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          message: null,
        },
      ]
      ;(getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser)
      mockSupabase.from.mockReturnValue(mockInvitationsTable)
      mockInvitationsTable.order.mockResolvedValue({
        data: mockInvitations,
        error: null,
      })

      // Act
      const result = await getSentInvitations()

      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data?.[0]?.inviteeEmail).toBe('supporter@example.com')
    })

    it('未認証の場合はエラーを返す', async () => {
      // Arrange
      ;(getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(null)

      // Act
      const result = await getSentInvitations()

      // Assert
      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('UNAUTHORIZED')
    })
  })

  describe('getReceivedInvitations', () => {
    it('受信した招待一覧を取得できる', async () => {
      // Arrange
      const mockUser = {
        id: 'supporter-456',
        email: 'supporter@example.com',
        role: 'supporter' as const,
        displayName: '支援者テスト',
      }
      const mockInvitations = [
        {
          id: 'invitation-123',
          inviter_id: 'patient-123',
          role: 'supporter',
          token: 'token-123',
          status: 'pending',
          expires_at: '2024-12-31T23:59:59Z',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          message: null,
          users: { display_name: '患者テスト', email: 'patient@example.com', role: 'patient' },
        },
      ]
      ;(getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser)
      mockSupabase.from.mockReturnValue(mockInvitationsTable)
      mockInvitationsTable.order.mockResolvedValue({
        data: mockInvitations,
        error: null,
      })

      // Act
      const result = await getReceivedInvitations()

      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data?.[0]?.inviterName).toBe('患者テスト')
    })

    it('未認証の場合はエラーを返す', async () => {
      // Arrange
      ;(getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(null)

      // Act
      const result = await getReceivedInvitations()

      // Assert
      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('UNAUTHORIZED')
    })
  })
})
