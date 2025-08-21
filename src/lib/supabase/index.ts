/**
 * Supabaseライブラリのエントリーポイント
 * Feature-based Architectureに従い、lib層から適切にエクスポート
 */

// 設定
export { supabaseConfig, validateSupabaseConfig } from './config'

// クライアント（ブラウザ用）
export { createClient, getSupabaseClient } from './client'

// サーバーサイドクライアントは server.ts から直接インポートして使用

// 型定義は後続タスクで追加
export type { Database } from './types'
