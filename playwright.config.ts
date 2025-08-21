import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for E2E testing
 * Next.js アプリケーション用のE2Eテスト設定
 */
export default defineConfig({
  // テストディレクトリ
  testDir: './tests/e2e',
  
  // 全体的なタイムアウト設定
  timeout: 30_000,
  expect: {
    // アサーションのタイムアウト
    timeout: 5_000,
  },
  
  // グローバルセットアップとティアダウン
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',
  
  // テスト実行設定
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : 2,
  
  // レポート設定
  reporter: 'html',
  
  // 共通設定
  use: {
    // ベースURL（Next.js開発サーバー）
    baseURL: 'http://localhost:3000',
    
    // トレース設定（失敗時のみ）
    trace: 'on-first-retry',
    
    // スクリーンショット設定
    screenshot: 'only-on-failure',
    
    // ビデオ設定
    video: 'retain-on-failure',
    
    // 操作間の待機時間
    actionTimeout: 0,
  },

  // プロジェクト設定（ブラウザ別）
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // モバイルテスト（必要に応じて有効化）
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],

  // ローカル開発サーバーの設定
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
})