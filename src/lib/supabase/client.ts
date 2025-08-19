/**
 * Supabaseクライアント初期化
 * Next.js 15 App Router + Cookie-based認証対応
 */

import { createBrowserClient } from '@supabase/ssr'
import { supabaseConfig } from './config'

/**
 * ブラウザ用Supabaseクライアント
 * Client Componentsで使用
 */
export const createClient = () => {
  return createBrowserClient(supabaseConfig.url, supabaseConfig.anonKey)
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
