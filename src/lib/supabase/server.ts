/**
 * Supabaseサーバーサイドクライアント
 * Next.js 15 App Router Server Components用
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseConfig } from './config'

/**
 * サーバーサイド用Supabaseクライアント
 * Server Components、API Routes、Middleware で使用
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
          // biome-ignore lint/complexity/noForEach: 外部ライブラリの仕様に合わせる
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Server Components内でのCookie設定エラーは無視
          // これはSupabase SSRライブラリの既知の動作
        }
      },
    },
  })
}

/**
 * Route Handler用Supabaseクライアント
 * API Routesで使用（Cookie操作が可能）
 */
export const createRouteHandlerClient = async () => {
  const cookieStore = await cookies()

  return createServerClient(supabaseConfig.url, supabaseConfig.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        // biome-ignore lint/complexity/noForEach: 外部ライブラリの仕様に合わせる
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
      },
    },
  })
}
