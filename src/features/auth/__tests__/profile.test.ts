/**
 * プロファイル管理API テスト
 */

import { getSupabaseClient } from '@/lib/supabase'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getProfile, updateProfile } from '../api/profile'
import type { ProfileUpdateParams } from '../types'

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

describe('Profile API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(getSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase)
    mockSupabase.from.mockReturnValue(mockUsersTable)
  })

  describe('getProfile', () => {
    it('認証されたユーザーのプロファイル情報を取得できる', async () => {
      // Arrange
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'patient' as const,
        display_name: 'テストユーザー',
        phone_number: '090-1234-5678',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockUsersTable.single.mockResolvedValue({
        data: mockProfile,
        error: null,
      })

      // Act
      const result = await getProfile()

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.displayName).toBe('テストユーザー')
        expect(result.data.email).toBe('test@example.com')
        expect(result.data.role).toBe('patient')
      }
      expect(mockSupabase.from).toHaveBeenCalledWith('users')
      expect(mockUsersTable.eq).toHaveBeenCalledWith('id', 'user-123')
    })

    it('認証されていない場合はエラーを返す', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      // Act
      const result = await getProfile()

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('UNAUTHORIZED')
        expect(result.error.message).toContain('認証されていません')
      }
    })

    it('プロファイル情報が見つからない場合はエラーを返す', async () => {
      // Arrange
      const mockUser = { id: 'user-123', email: 'test@example.com' }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockUsersTable.single.mockResolvedValue({
        data: null,
        error: { message: 'Profile not found', code: 'PGRST116' },
      })

      // Act
      const result = await getProfile()

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('PROFILE_NOT_FOUND')
        expect(result.error.message).toContain('プロファイル情報が見つかりません')
      }
    })
  })

  describe('updateProfile', () => {
    it('プロファイル情報を更新できる', async () => {
      // Arrange
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      const updateParams: ProfileUpdateParams = {
        displayName: '更新されたユーザー名',
        phoneNumber: '080-9876-5432',
      }

      const updatedProfile = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'patient' as const,
        display_name: '更新されたユーザー名',
        phone_number: '080-9876-5432',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockUsersTable.single.mockResolvedValue({
        data: updatedProfile,
        error: null,
      })

      // Act
      const result = await updateProfile(updateParams)

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.displayName).toBe('更新されたユーザー名')
        expect(result.data.phoneNumber).toBe('080-9876-5432')
      }
      expect(mockUsersTable.update).toHaveBeenCalledWith({
        display_name: '更新されたユーザー名',
        phone_number: '080-9876-5432',
      })
      expect(mockUsersTable.eq).toHaveBeenCalledWith('id', 'user-123')
    })

    it('他のユーザーのプロファイル更新を防ぐ（RLS準拠）', async () => {
      // Arrange - 認証されていない状態をモック
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const updateParams: ProfileUpdateParams = {
        displayName: '悪意のある更新',
      }

      // Act
      const result = await updateProfile(updateParams)

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('UNAUTHORIZED')
        expect(result.error.message).toContain('認証されていません')
      }
      expect(mockUsersTable.update).not.toHaveBeenCalled()
    })

    it('空のパラメータでの更新は何も変更しない', async () => {
      // Arrange
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      const updateParams: ProfileUpdateParams = {}

      const currentProfile = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'patient' as const,
        display_name: 'テストユーザー',
        phone_number: '090-1234-5678',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockUsersTable.single.mockResolvedValue({
        data: currentProfile,
        error: null,
      })

      // Act
      const result = await updateProfile(updateParams)

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.displayName).toBe('テストユーザー')
        expect(result.data.phoneNumber).toBe('090-1234-5678')
      }
      // 空のパラメータなので update は呼ばれない
      expect(mockUsersTable.update).not.toHaveBeenCalled()
    })
  })
})
