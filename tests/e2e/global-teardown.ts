/**
 * Playwright グローバルティアダウン
 * テスト実行後のクリーンアップ処理
 */

import { type FullConfig } from '@playwright/test'

async function globalTeardown(_config: FullConfig) {
  console.log('🧹 E2Eテストのグローバルティアダウンを開始...')
  console.log('✅ グローバルティアダウンが完了しました')
}

export default globalTeardown