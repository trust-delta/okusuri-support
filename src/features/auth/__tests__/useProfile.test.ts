/**
 * useProfile hook テスト
 */

import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as profileApi from '../api/profile'
import { useProfile } from '../hooks/useProfile'
import type { ProfileResult, ProfileUpdateParams } from '../types'

// profile APIをモック
vi.mock('../api/profile')

// Supabaseクライアントもモック化（間接的な依存を回避）
vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: vi.fn(),
  createServerSupabaseClient: vi.fn(),
}))

const mockProfileApi = profileApi as typeof profileApi & {
  getProfile: ReturnType<typeof vi.fn>
  updateProfile: ReturnType<typeof vi.fn>
}

describe('useProfile Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('初期化時にプロファイル情報を取得する', async () => {
    // Arrange
    const mockProfile: ProfileResult = {
      id: 'user-123',
      email: 'test@example.com',
      role: 'patient',
      displayName: 'テストユーザー',
      phoneNumber: '090-1234-5678',
      emailConfirmed: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    }

    mockProfileApi.getProfile.mockResolvedValue({
      success: true,
      data: mockProfile,
    })

    // Act
    const { result } = renderHook(() => useProfile())

    // Assert - 初期状態
    expect(result.current.isLoading).toBe(true)
    expect(result.current.profile).toBeNull()
    expect(result.current.error).toBeNull()

    // Assert - プロファイル取得後
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.profile).toEqual(mockProfile)
    expect(result.current.error).toBeNull()
    expect(mockProfileApi.getProfile).toHaveBeenCalledTimes(1)
  })

  it('プロファイル取得エラー時は適切なエラー状態を設定する', async () => {
    // Arrange
    const mockError = {
      code: 'PROFILE_NOT_FOUND',
      message: 'プロファイル情報が見つかりません',
    }

    mockProfileApi.getProfile.mockResolvedValue({
      success: false,
      error: mockError,
    })

    // Act
    const { result } = renderHook(() => useProfile())

    // Assert - エラー後の状態
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.profile).toBeNull()
    expect(result.current.error).toEqual(mockError)
  })

  it('updateProfile関数でプロファイル更新ができる', async () => {
    // Arrange
    const initialProfile: ProfileResult = {
      id: 'user-123',
      email: 'test@example.com',
      role: 'patient',
      displayName: 'テストユーザー',
      phoneNumber: '090-1234-5678',
      emailConfirmed: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    }

    const updatedProfile: ProfileResult = {
      ...initialProfile,
      displayName: '更新されたユーザー',
      phoneNumber: '080-9876-5432',
      updatedAt: '2024-01-02T00:00:00Z',
    }

    const updateParams: ProfileUpdateParams = {
      displayName: '更新されたユーザー',
      phoneNumber: '080-9876-5432',
    }

    mockProfileApi.getProfile.mockResolvedValue({
      success: true,
      data: initialProfile,
    })

    mockProfileApi.updateProfile.mockResolvedValue({
      success: true,
      data: updatedProfile,
    })

    // Act
    const { result } = renderHook(() => useProfile())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    let updateResult: Awaited<ReturnType<typeof result.current.updateProfile>>
    await act(async () => {
      updateResult = await result.current.updateProfile(updateParams)
    })

    // Assert
    expect(updateResult!.success).toBe(true)
    if (updateResult!.success) {
      expect(updateResult.data).toEqual(updatedProfile)
    }
    expect(result.current.profile).toEqual(updatedProfile)
    expect(mockProfileApi.updateProfile).toHaveBeenCalledWith(updateParams)
  })

  it('updateProfile失敗時はエラーを返し状態は変更しない', async () => {
    // Arrange
    const initialProfile: ProfileResult = {
      id: 'user-123',
      email: 'test@example.com',
      role: 'patient',
      displayName: 'テストユーザー',
      phoneNumber: '090-1234-5678',
      emailConfirmed: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    }

    const updateError = {
      code: 'UPDATE_FAILED',
      message: '更新に失敗しました',
    }

    const updateParams: ProfileUpdateParams = {
      displayName: '更新失敗ユーザー',
    }

    mockProfileApi.getProfile.mockResolvedValue({
      success: true,
      data: initialProfile,
    })

    mockProfileApi.updateProfile.mockResolvedValue({
      success: false,
      error: updateError,
    })

    // Act
    const { result } = renderHook(() => useProfile())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    let updateResult: Awaited<ReturnType<typeof result.current.updateProfile>>
    await act(async () => {
      updateResult = await result.current.updateProfile(updateParams)
    })

    // Assert
    expect(updateResult!.success).toBe(false)
    if (!updateResult!.success) {
      expect(updateResult.error).toEqual(updateError)
    }
    // プロファイル状態は元のまま（更新されない）
    expect(result.current.profile).toEqual(initialProfile)
    expect(result.current.error).toBeNull() // hookレベルのエラーは設定されない
  })

  it('refreshProfile関数でプロファイル情報を再取得できる', async () => {
    // Arrange
    const initialProfile: ProfileResult = {
      id: 'user-123',
      email: 'test@example.com',
      role: 'patient',
      displayName: 'テストユーザー',
      phoneNumber: '090-1234-5678',
      emailConfirmed: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    }

    const refreshedProfile: ProfileResult = {
      ...initialProfile,
      displayName: 'リフレッシュ後のユーザー',
      updatedAt: '2024-01-03T00:00:00Z',
    }

    mockProfileApi.getProfile
      .mockResolvedValueOnce({
        success: true,
        data: initialProfile,
      })
      .mockResolvedValueOnce({
        success: true,
        data: refreshedProfile,
      })

    // Act
    const { result } = renderHook(() => useProfile())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.profile).toEqual(initialProfile)

    await act(async () => {
      await result.current.refreshProfile()
    })

    // Assert
    expect(result.current.profile).toEqual(refreshedProfile)
    expect(mockProfileApi.getProfile).toHaveBeenCalledTimes(2)
  })
})
