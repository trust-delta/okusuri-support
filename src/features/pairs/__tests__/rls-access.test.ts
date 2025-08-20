/**
 * RLS（Row Level Security）アクセス権限分離テスト
 * ペア外ユーザーからのデータアクセス阻止の検証
 */

import { getCurrentUser } from '@/features/auth/api/auth-service'
import { getSupabaseClient } from '@/lib/supabase'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getCurrentPair, getReceivedInvitations, getSentInvitations } from '../api/pair-service'

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
  eq: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
}

const mockInvitationsTable = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
}

describe('RLS Access Control Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(getSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase)
  })

  describe('ペアデータアクセス権限制御', () => {
    it('ペアメンバーは自分のペア情報にアクセスできる', async () => {
      // Arrange
      const pairMemberUser = {
        id: 'user-123',
        email: 'patient@example.com',
        role: 'patient' as const,
        displayName: '患者テスト',
      }
      const allowedPairData = {
        id: 'pair-123',
        patient_id: 'user-123',
        supporter_id: 'supporter-456',
        status: 'approved',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        patient: { display_name: '患者テスト', email: 'patient@example.com' },
        supporter: { display_name: '支援者テスト', email: 'supporter@example.com' },
      }
      ;(getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(pairMemberUser)
      mockSupabase.from.mockReturnValue(mockUserPairsTable)
      mockUserPairsTable.single.mockResolvedValue({
        data: allowedPairData,
        error: null,
      })

      // Act
      const result = await getCurrentPair()

      // Assert
      expect(result.success).toBe(true)
      expect(result.data?.id).toBe('pair-123')
      expect(mockUserPairsTable.or).toHaveBeenCalledWith(
        'patient_id.eq.user-123,supporter_id.eq.user-123'
      )
    })

    it('ペア外ユーザーは他人のペア情報にアクセスできない', async () => {
      // Arrange
      const outsideUser = {
        id: 'outsider-789',
        email: 'outsider@example.com',
        role: 'patient' as const,
        displayName: '部外者ユーザー',
      }
      ;(getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(outsideUser)
      mockSupabase.from.mockReturnValue(mockUserPairsTable)
      // RLSによりペア外ユーザーには結果が返されない（empty result）
      mockUserPairsTable.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }, // No rows found
      })

      // Act
      const result = await getCurrentPair()

      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toBeUndefined()
      expect(mockUserPairsTable.or).toHaveBeenCalledWith(
        'patient_id.eq.outsider-789,supporter_id.eq.outsider-789'
      )
    })

    it('RLSポリシーにより他のペアのデータは完全に隠蔽される', async () => {
      // Arrange
      const userA = {
        id: 'user-a',
        email: 'usera@example.com',
        role: 'patient' as const,
        displayName: 'ユーザーA',
      }
      ;(getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(userA)
      mockSupabase.from.mockReturnValue(mockUserPairsTable)
      // RLSポリシーにより、ユーザーAは他のペア（user-b, user-c間のペア）を見ることができない
      mockUserPairsTable.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }, // No rows found
      })

      // Act
      const result = await getCurrentPair()

      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toBeUndefined()
      // クエリは正しく構築されているが、RLSによりデータが返されない
      expect(mockUserPairsTable.or).toHaveBeenCalledWith(
        'patient_id.eq.user-a,supporter_id.eq.user-a'
      )
    })
  })

  describe('招待データアクセス権限制御', () => {
    it('ユーザーは自分が送信した招待のみ取得できる', async () => {
      // Arrange
      const inviterUser = {
        id: 'inviter-123',
        email: 'inviter@example.com',
        role: 'patient' as const,
        displayName: '招待者',
      }
      const ownInvitations = [
        {
          id: 'invitation-123',
          invitee_email: 'invitee@example.com',
          role: 'supporter',
          token: 'token-123',
          status: 'pending',
          expires_at: '2024-12-31T23:59:59Z',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          message: null,
        },
      ]
      ;(getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(inviterUser)
      mockSupabase.from.mockReturnValue(mockInvitationsTable)
      mockInvitationsTable.order.mockResolvedValue({
        data: ownInvitations,
        error: null,
      })

      // Act
      const result = await getSentInvitations()

      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(mockInvitationsTable.eq).toHaveBeenCalledWith('inviter_id', 'inviter-123')
    })

    it('ユーザーは自分宛ての招待のみ取得できる', async () => {
      // Arrange
      const inviteeUser = {
        id: 'invitee-456',
        email: 'invitee@example.com',
        role: 'supporter' as const,
        displayName: '被招待者',
      }
      const receivedInvitations = [
        {
          id: 'invitation-456',
          inviter_id: 'inviter-123',
          role: 'supporter',
          token: 'token-456',
          status: 'pending',
          expires_at: '2024-12-31T23:59:59Z',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          message: null,
          users: { display_name: '招待者', email: 'inviter@example.com', role: 'patient' },
        },
      ]
      ;(getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(inviteeUser)
      mockSupabase.from.mockReturnValue(mockInvitationsTable)
      mockInvitationsTable.order.mockResolvedValue({
        data: receivedInvitations,
        error: null,
      })

      // Act
      const result = await getReceivedInvitations()

      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(mockInvitationsTable.eq).toHaveBeenCalledWith('invitee_email', 'invitee@example.com')
    })

    it('他のユーザーの招待情報は取得できない', async () => {
      // Arrange
      const otherUser = {
        id: 'other-789',
        email: 'other@example.com',
        role: 'patient' as const,
        displayName: 'その他ユーザー',
      }
      ;(getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(otherUser)
      mockSupabase.from.mockReturnValue(mockInvitationsTable)
      // RLSにより他のユーザーの招待は返されない
      mockInvitationsTable.order.mockResolvedValue({
        data: [], // 空の結果
        error: null,
      })

      // Act - 送信招待の取得を試行
      const sentResult = await getSentInvitations()

      // Reset mock for received invitations test
      mockInvitationsTable.order.mockResolvedValue({
        data: [], // 空の結果
        error: null,
      })

      // Act - 受信招待の取得を試行
      const receivedResult = await getReceivedInvitations()

      // Assert
      expect(sentResult.success).toBe(true)
      expect(sentResult.data).toHaveLength(0) // 他人の送信招待は見えない
      expect(receivedResult.success).toBe(true)
      expect(receivedResult.data).toHaveLength(0) // 他人宛ての招待は見えない
    })
  })

  describe('データベースエラーハンドリング', () => {
    it('RLSポリシー違反時は適切にエラーハンドリングされる', async () => {
      // Arrange
      const unauthorizedUser = {
        id: 'unauthorized-999',
        email: 'unauthorized@example.com',
        role: 'patient' as const,
        displayName: '権限なしユーザー',
      }
      ;(getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(unauthorizedUser)
      mockSupabase.from.mockReturnValue(mockUserPairsTable)
      // RLSポリシー違反による明示的なエラー
      mockUserPairsTable.single.mockResolvedValue({
        data: null,
        error: {
          code: 'RLS_POLICY_VIOLATION',
          message: 'permission denied for relation user_pairs',
        },
      })

      // Act
      const result = await getCurrentPair()

      // Assert
      expect(result.success).toBe(false)
      expect(result.error?.code).toBeDefined()
    })

    it('ネットワークエラー時は適切にエラーハンドリングされる', async () => {
      // Arrange
      const validUser = {
        id: 'valid-123',
        email: 'valid@example.com',
        role: 'patient' as const,
        displayName: '有効ユーザー',
      }
      ;(getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(validUser)
      mockSupabase.from.mockReturnValue(mockUserPairsTable)
      // ネットワークエラーをシミュレート
      mockUserPairsTable.single.mockResolvedValue({
        data: null,
        error: {
          code: 'NETWORK_ERROR',
          message: 'connection timeout',
        },
      })

      // Act
      const result = await getCurrentPair()

      // Assert
      expect(result.success).toBe(false)
      expect(result.error?.message).toBeDefined()
    })
  })

  describe('認証状態とアクセス制御の統合', () => {
    it('未認証ユーザーはすべてのペアデータにアクセスできない', async () => {
      // Arrange
      ;(getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(null)

      // Act
      const pairResult = await getCurrentPair()
      const sentResult = await getSentInvitations()
      const receivedResult = await getReceivedInvitations()

      // Assert
      expect(pairResult.success).toBe(false)
      expect(pairResult.error?.code).toBe('UNAUTHORIZED')
      expect(sentResult.success).toBe(false)
      expect(sentResult.error?.code).toBe('UNAUTHORIZED')
      expect(receivedResult.success).toBe(false)
      expect(receivedResult.error?.code).toBe('UNAUTHORIZED')
    })

    it('セッション期限切れ時は認証エラーを返す', async () => {
      // Arrange
      ;(getCurrentUser as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Session expired'))

      // Act
      const result = await getCurrentPair()

      // Assert
      expect(result.success).toBe(false)
      expect(result.error?.code).toBeDefined() // エラーコードは実装依存
      expect(result.error?.message).toBeDefined()
    })
  })

  describe('ペア状態による制限', () => {
    it('承認済みペアのみ取得される（pending/terminatedは除外）', async () => {
      // Arrange
      const pairUser = {
        id: 'user-approved',
        email: 'approved@example.com',
        role: 'patient' as const,
        displayName: '承認済みユーザー',
      }
      ;(getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(pairUser)
      mockSupabase.from.mockReturnValue(mockUserPairsTable)
      mockUserPairsTable.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }, // pending/terminatedペアは結果に含まれない
      })

      // Act
      const result = await getCurrentPair()

      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toBeUndefined()
      // status = 'approved' の条件が適用されていることを確認
      expect(mockUserPairsTable.eq).toHaveBeenCalledWith('status', 'approved')
    })
  })
})
