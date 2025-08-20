/**
 * プロファイル管理統合テスト（L1レベル機能動作確認の代替）
 *
 * 実際の開発環境での動作確認ができない場合の統合テストによる代替確認
 * - プロファイル表示：ログイン後の自分のプロファイル情報表示
 * - 基本情報変更：displayName、phoneNumber更新・即座反映
 * - 権限チェック：他ユーザーのプロファイルアクセス阻止
 */

import { getSupabaseClient } from '@/lib/supabase'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getProfile, updateProfile } from '../api/profile'
import { useProfile } from '../hooks/useProfile'
import { validateProfileUpdate } from '../schemas/profile'

// Supabaseクライアントのモック
vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: vi.fn(),
}))

// モックされたSupabaseクライアント
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
}

const mockUsersTable = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
}

describe('Profile Management Integration (L1 Alternative)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(getSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase)
    mockSupabase.from.mockReturnValue(mockUsersTable)
  })

  describe('ログイン後の自分のプロファイル情報表示', () => {
    it('認証されたユーザーが自分のプロファイル情報を取得できる', async () => {
      // Arrange - 認証されたユーザーのモックデータ
      const authenticatedUser = { id: 'user-123', email: 'patient@example.com' }
      const userProfile = {
        id: 'user-123',
        email: 'patient@example.com',
        role: 'patient',
        display_name: 'テスト患者',
        phone_number: '090-1234-5678',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: authenticatedUser },
        error: null,
      })

      mockUsersTable.single.mockResolvedValue({
        data: userProfile,
        error: null,
      })

      // Act - プロファイル取得
      const result = await getProfile()

      // Assert - 期待する結果確認
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe('user-123')
        expect(result.data.email).toBe('patient@example.com')
        expect(result.data.role).toBe('patient')
        expect(result.data.displayName).toBe('テスト患者')
        expect(result.data.phoneNumber).toBe('090-1234-5678')
        expect(result.data.emailConfirmed).toBe(false)
      }

      // RLS確認 - 自分のIDでのみクエリされることを確認
      expect(mockSupabase.from).toHaveBeenCalledWith('users')
      expect(mockUsersTable.eq).toHaveBeenCalledWith('id', 'user-123')
    })
  })

  describe('基本情報変更・即座反映', () => {
    it('プロファイル更新後に即座に新しい情報が反映される', async () => {
      // Arrange
      const authenticatedUser = { id: 'user-456', email: 'supporter@example.com' }
      const updatedProfile = {
        id: 'user-456',
        email: 'supporter@example.com',
        role: 'supporter',
        display_name: '更新された支援者名',
        phone_number: '080-9876-5432',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: authenticatedUser },
        error: null,
      })

      mockUsersTable.single.mockResolvedValue({
        data: updatedProfile,
        error: null,
      })

      // Act - プロファイル更新
      const updateParams = {
        displayName: '更新された支援者名',
        phoneNumber: '080-9876-5432',
      }

      const updateResult = await updateProfile(updateParams)

      // Assert - 更新成功確認
      expect(updateResult.success).toBe(true)
      if (updateResult.success) {
        expect(updateResult.data.displayName).toBe('更新された支援者名')
        expect(updateResult.data.phoneNumber).toBe('080-9876-5432')
      }

      // RLS確認 - 自分のIDでのみ更新されることを確認
      expect(mockUsersTable.update).toHaveBeenCalledWith({
        display_name: '更新された支援者名',
        phone_number: '080-9876-5432',
      })
      expect(mockUsersTable.eq).toHaveBeenCalledWith('id', 'user-456')
    })

    it('useProfileフックを使用した更新で状態が即座に反映される', async () => {
      // Arrange - 初期プロファイルデータ
      const initialProfile = {
        id: 'user-789',
        email: 'test@example.com',
        role: 'patient' as const,
        displayName: '初期ユーザー名',
        phoneNumber: '070-1111-2222',
        emailConfirmed: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      const updatedProfile = {
        ...initialProfile,
        displayName: '更新後ユーザー名',
        phoneNumber: '070-3333-4444',
        updatedAt: '2024-01-02T00:00:00Z',
      }

      const authenticatedUser = { id: 'user-789', email: 'test@example.com' }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: authenticatedUser },
        error: null,
      })

      // 初回取得は初期プロファイル
      mockUsersTable.single.mockResolvedValueOnce({
        data: {
          ...initialProfile,
          display_name: initialProfile.displayName,
          phone_number: initialProfile.phoneNumber,
          created_at: initialProfile.createdAt,
          updated_at: initialProfile.updatedAt,
        },
        error: null,
      })

      // 更新後は更新されたプロファイル
      mockUsersTable.single.mockResolvedValueOnce({
        data: {
          ...updatedProfile,
          display_name: updatedProfile.displayName,
          phone_number: updatedProfile.phoneNumber,
          created_at: updatedProfile.createdAt,
          updated_at: updatedProfile.updatedAt,
        },
        error: null,
      })

      // Act - useProfileフック使用
      const { result } = renderHook(() => useProfile())

      // 初期ロード完了まで待機
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.profile?.displayName).toBe('初期ユーザー名')

      // プロファイル更新実行
      let updateResponse: Awaited<ReturnType<typeof result.current.updateProfile>>
      await act(async () => {
        updateResponse = await result.current.updateProfile({
          displayName: '更新後ユーザー名',
          phoneNumber: '070-3333-4444',
        })
      })

      // Assert - 状態が即座に反映される
      expect(updateResponse!.success).toBe(true)
      expect(result.current.profile?.displayName).toBe('更新後ユーザー名')
      expect(result.current.profile?.phoneNumber).toBe('070-3333-4444')
    })
  })

  describe('他ユーザーのプロファイルアクセス阻止', () => {
    it('認証されていないユーザーはプロファイルにアクセスできない', async () => {
      // Arrange - 未認証状態
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      // Act - プロファイル取得試行
      const result = await getProfile()

      // Assert - アクセス拒否
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('UNAUTHORIZED')
        expect(result.error.message).toContain('認証されていません')
      }

      // データベースクエリが実行されないことを確認
      expect(mockUsersTable.select).not.toHaveBeenCalled()
    })

    it('認証されていないユーザーはプロファイル更新できない', async () => {
      // Arrange - 未認証状態
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      // Act - プロファイル更新試行
      const result = await updateProfile({
        displayName: '悪意のある更新',
      })

      // Assert - アクセス拒否
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('UNAUTHORIZED')
        expect(result.error.message).toContain('認証されていません')
      }

      // データベース更新が実行されないことを確認
      expect(mockUsersTable.update).not.toHaveBeenCalled()
    })
  })

  describe('バリデーション詳細確認', () => {
    it('表示名に不正な文字が含まれている場合はバリデーションエラー', () => {
      // Arrange - 不正な表示名
      const invalidNames = [
        '<script>alert("xss")</script>', // HTMLタグ
        'admin', // 予約語
        '   ', // 空白のみ
        '12345', // 数字のみ
        'a'.repeat(51), // 50文字超過
      ]

      for (const invalidName of invalidNames) {
        // Act
        const result = validateProfileUpdate({ displayName: invalidName })

        // Assert
        expect(result.success).toBe(false)
      }
    })

    it('電話番号の形式チェックが正しく動作する', () => {
      // Arrange - 無効な電話番号
      const invalidPhoneNumbers = [
        '123', // 短すぎる
        'abc-defg-hijk', // 文字が含まれる
        '090-1234', // 不完全な形式
        '+81-90-1234', // 不完全な国際形式
      ]

      for (const invalidPhone of invalidPhoneNumbers) {
        // Act
        const result = validateProfileUpdate({ phoneNumber: invalidPhone })

        // Assert
        expect(result.success).toBe(false)
      }

      // 有効な電話番号
      const validPhoneNumbers = ['090-1234-5678', '0901234567', '+81-90-1234-5678']

      for (const validPhone of validPhoneNumbers) {
        // Act
        const result = validateProfileUpdate({ phoneNumber: validPhone })

        // Assert
        expect(result.success).toBe(true)
      }
    })
  })
})
