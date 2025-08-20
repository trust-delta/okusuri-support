/**
 * Supabaseクライアント初期化
 * Next.js 15 App Router + Cookie-based認証対応
 * SSR/SSG対応の強化とセッション管理
 */

import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseConfig } from './config'

/**
 * ブラウザ用Supabaseクライアント
 * Client Componentsで使用
 * Cookie-basedセッション管理対応
 */
export const createClient = () => {
  return createBrowserClient(supabaseConfig.url, supabaseConfig.anonKey)
}

/**
 * サーバー用Supabaseクライアント
 * Server Components、Server Actions、Route Handlersで使用
 */
export const createServerSupabaseClient = async () => {
  const cookieStore = await cookies()

  return createServerClient(supabaseConfig.url, supabaseConfig.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set({ name, value, ...options })
          }
        } catch (error) {
          // SSR時にクッキー設定エラーが発生する場合があるため、
          // ログ出力のみ行い処理を続行
          console.warn('Failed to set cookies:', error)
        }
      },
    },
  })
}

/**
 * グローバルクライアントインスタンス（シングルトン）
 * 複数インスタンス作成を防止
 */
let supabaseClient: ReturnType<typeof createClient> | null = null

export const getSupabaseClient = () => {
  if (typeof window === 'undefined') {
    throw new Error('getSupabaseClient should only be called on the client side')
  }

  if (!supabaseClient) {
    supabaseClient = createClient()
  }

  return supabaseClient
}

/**
 * コンテキストに応じた適切なクライアントを取得
 * SSR/CSRの判定を自動で行う
 */
export const getContextualClient = async () => {
  if (typeof window === 'undefined') {
    // サーバーサイドの場合
    return await createServerSupabaseClient()
  }
  // クライアントサイドの場合
  return getSupabaseClient()
}

/**
 * セッション管理用のクライアント設定
 */
export const createClientWithSession = (
  options: {
    persistSession?: boolean
    detectSessionInUrl?: boolean
    autoRefreshToken?: boolean
  } = {}
) => {
  const defaultOptions = {
    persistSession: true,
    detectSessionInUrl: true,
    autoRefreshToken: true,
    ...options,
  }

  if (typeof window === 'undefined') {
    throw new Error('createClientWithSession should only be called on the client side')
  }

  return createBrowserClient(supabaseConfig.url, supabaseConfig.anonKey, {
    auth: defaultOptions,
  })
}
