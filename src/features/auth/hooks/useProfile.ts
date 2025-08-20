/**
 * プロファイル管理カスタムフック
 * ユーザープロファイルの状態管理とAPIアクセス機能を提供
 */

import { useCallback, useEffect, useState } from 'react'
import { getProfile, updateProfile } from '../api/profile'
import type {
  AuthError,
  AuthResponse,
  ProfileResult,
  ProfileUpdateParams,
  ProfileUpdateResult,
  UseProfileReturn,
} from '../types'

/**
 * プロファイル管理フック
 *
 * プロファイル情報の取得・更新機能を提供し、状態管理を行う
 * RLS準拠のアクセス制御により、認証されたユーザーは自分の情報のみ操作可能
 *
 * @returns プロファイル情報、ローディング状態、エラー、操作関数
 */
export function useProfile(): UseProfileReturn {
  // 状態管理
  const [profile, setProfile] = useState<ProfileResult | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<AuthError | null>(null)

  /**
   * プロファイル情報の取得処理
   * 初期化時とrefreshProfile呼び出し時に実行
   */
  const fetchProfile = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const result = await getProfile()

      if (result.success && result.data) {
        setProfile(result.data)
        setError(null)
      } else {
        setProfile(null)
        setError(result.error ?? null)
      }
    } catch (err) {
      setProfile(null)
      setError({
        code: 'FETCH_ERROR',
        message: 'プロファイル情報の取得中にエラーが発生しました',
        details: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * プロファイル情報の更新処理
   *
   * @param params 更新するプロファイルパラメータ
   * @returns 更新結果のPromise
   */
  const handleUpdateProfile = useCallback(
    async (params: ProfileUpdateParams): Promise<AuthResponse<ProfileUpdateResult>> => {
      try {
        const result = await updateProfile(params)

        if (result.success && result.data) {
          // 更新成功時はローカル状態も更新
          setProfile(result.data)
          setError(null)
        }
        // updateProfile関数は更新が失敗してもフックレベルのエラー状態は設定しない
        // 呼び出し元が結果を確認して適切に処理する

        return result
      } catch (err) {
        const errorResult: AuthResponse<ProfileUpdateResult> = {
          success: false,
          error: {
            code: 'UPDATE_ERROR',
            message: 'プロファイル更新中にエラーが発生しました',
            details: err instanceof Error ? err.message : String(err),
          },
        }
        return errorResult
      }
    },
    []
  )

  /**
   * プロファイル情報の再取得
   * 手動でプロファイル情報を最新化したい場合に使用
   */
  const refreshProfile = useCallback(async (): Promise<void> => {
    await fetchProfile()
  }, [fetchProfile])

  // 初期化時にプロファイル取得
  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  return {
    profile,
    isLoading,
    error,
    updateProfile: handleUpdateProfile,
    refreshProfile,
  }
}

/**
 * プロファイル状態の型ガード関数
 * プロファイルがロード済みかどうかを判定
 */
export function isProfileLoaded(
  profileState: UseProfileReturn
): profileState is UseProfileReturn & {
  profile: ProfileResult
  isLoading: false
  error: null
} {
  return !profileState.isLoading && profileState.profile !== null && profileState.error === null
}

/**
 * プロファイルエラー状態の型ガード関数
 * エラー状態かどうかを判定
 */
export function hasProfileError(
  profileState: UseProfileReturn
): profileState is UseProfileReturn & {
  error: AuthError
} {
  return profileState.error !== null
}
