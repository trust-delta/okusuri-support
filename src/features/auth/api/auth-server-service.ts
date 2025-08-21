/**
 * 認証API サーバーサイド専用サービス
 * Server Components、API Routes専用
 */

import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { AuthUser } from '../types'

/**
 * SupabaseユーザーをAuthUserに変換（サーバーサイド版）
 */
function transformToAuthUserServer(
  user: { id: string; email?: string; email_confirmed_at?: string },
  userData: { name: string; role: string; created_at: string; updated_at: string }
): AuthUser {
  return {
    id: user.id,
    email: user.email || '',
    emailConfirmed: !!user.email_confirmed_at,
    role: userData.role as 'patient' | 'supporter',
    displayName: userData.name,
  }
}

/**
 * サーバーサイド用：現在のユーザー情報取得
 */
export async function getCurrentUserServer(): Promise<AuthUser | null> {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return null

    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error || !userData) {
      return null
    }

    return transformToAuthUserServer(user, userData)
  } catch (error) {
    console.error('getCurrentUserServer error:', error)
    return null
  }
}
