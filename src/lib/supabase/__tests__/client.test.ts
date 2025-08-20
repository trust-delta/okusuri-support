/**
 * Supabaseクライアント接続テスト
 * Red Phase: 失敗するテストを作成
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('Supabaseクライアント接続テスト', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('環境変数存在チェック', () => {
    it('NEXT_PUBLIC_SUPABASE_URLが存在する場合、設定が正常に読み込まれること', async () => {
      // 環境変数を設定
      process.env['NEXT_PUBLIC_SUPABASE_URL'] = 'https://test.supabase.co'
      process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
      process.env['SUPABASE_SERVICE_ROLE_KEY'] =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

      // 動的インポートでモジュールを再読み込み
      const { supabaseConfig } = await import('../config')
      expect(supabaseConfig.url).toBe('https://test.supabase.co')
      expect(supabaseConfig.anonKey).toContain('eyJhbGciOiJIUzI1NiI')
    })

    it('必須環境変数が不足している場合、エラーをスローすること', async () => {
      // 環境変数を削除
      process.env['NEXT_PUBLIC_SUPABASE_URL'] = undefined
      process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] = undefined

      // configのインポート時にエラーがスローされることを期待
      await expect(import('../config')).rejects.toThrow('Missing required environment variable')
    })
  })

  describe('Supabaseクライアント初期化', () => {
    beforeEach(() => {
      // テスト用環境変数設定
      process.env['NEXT_PUBLIC_SUPABASE_URL'] = 'https://test.supabase.co'
      process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
      process.env['SUPABASE_SERVICE_ROLE_KEY'] =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
    })

    it('createClient関数がSupabaseクライアントを返すこと', async () => {
      const { createClient } = await import('../client')
      const client = createClient()

      expect(client).toBeDefined()
      // Supabaseクライアントの基本プロパティが存在することを確認
      expect(client.auth).toBeDefined()
      expect(client.from).toBeDefined()
    })

    it('getSupabaseClient関数がシングルトンインスタンスを返すこと', async () => {
      // jsdom環境でwindowオブジェクトをモック
      vi.stubGlobal('window', {})

      const { getSupabaseClient } = await import('../client')
      const client1 = getSupabaseClient()
      const client2 = getSupabaseClient()

      expect(client1).toBe(client2) // 同一インスタンス
      expect(client1).toBeDefined()
    })

    it('サーバーサイドでgetSupabaseClientを呼び出すとエラーをスローすること', async () => {
      // windowオブジェクトを削除してサーバーサイド環境をシミュレート
      vi.stubGlobal('window', undefined)

      const { getSupabaseClient } = await import('../client')

      expect(() => getSupabaseClient()).toThrow(
        'getSupabaseClient should only be called on the client side'
      )
    })
  })
})
