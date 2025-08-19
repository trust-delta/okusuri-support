/**
 * Supabaseライブラリのエントリーポイント
 * Feature-based Architectureに従い、lib層から適切にエクスポート
 */

// 設定
export { supabaseConfig, validateSupabaseConfig } from './config'

// クライアント（ブラウザ用）
export { createClient, getSupabaseClient } from './client'

// サーバーサイドクライアント
export {
  createServerSupabaseClient,
  createRouteHandlerClient,
} from './server'

// 型定義は後続タスクで追加
export type { Database } from './types'
