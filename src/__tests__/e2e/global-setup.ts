/**
 * Playwright グローバルセットアップ
 * テスト実行前の環境準備と設定
 */

import type { FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  console.log('🚀 E2Eテストのグローバルセットアップを開始...')

  // テスト環境の確認
  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3000'
  console.log(`🌐 ベースURL: ${baseURL}`)

  console.log('✅ グローバルセットアップが完了しました')
}

export default globalSetup
