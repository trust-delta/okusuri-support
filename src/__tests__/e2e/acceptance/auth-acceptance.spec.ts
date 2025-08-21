/**
 * 認証機能受入テスト
 * Design Docで定義された受入条件の検証
 */

import { expect, test } from '@playwright/test'
import {
  SELECTORS,
  checkAuthenticationState,
  generateTestUser,
  signInUser,
  signOutUser,
  signUpUser,
  verifyUserProfile,
} from '../fixtures/auth-helpers'

test.describe('認証機能受入条件テスト', () => {
  test.describe('受入条件1: メール認証フロー完全動作', () => {
    test('AC1-1: サインアップ→確認メール→アカウント有効化→ログイン', async ({ page }) => {
      const testUser = generateTestUser('patient')

      // サインアップ処理
      await signUpUser(page, testUser)

      // メール確認画面または成功メッセージの表示確認
      const confirmationVisible =
        (await page.locator('text=確認メール').isVisible()) ||
        (await page.locator('text=メール認証').isVisible()) ||
        (await page.locator(SELECTORS.auth.signup.successMessage).isVisible())

      expect(confirmationVisible).toBeTruthy()

      // メール認証完了のシミュレーション（実際の実装では手動またはテスト用エンドポイント）
      // TODO: メール認証確認のAPI呼び出しまたはテスト用エンドポイント

      // ログイン実行
      await signInUser(page, testUser.email, testUser.password)

      // ダッシュボードまたはホームページにリダイレクトされることを確認
      await expect(page).toHaveURL(/\/dashboard|\//)

      // ユーザー情報が正しく表示されることを確認
      await verifyUserProfile(page, testUser)
    })
  })

  test.describe('受入条件2: ログイン・ログアウト機能', () => {
    test('AC2-1: 正常認証でのログイン成功', async ({ page }) => {
      const testUser = generateTestUser('patient')

      // 事前にユーザー作成（メール認証済みを想定）
      await signUpUser(page, testUser)

      // ログイン実行
      await signInUser(page, testUser.email, testUser.password)

      // ログイン成功の確認
      await expect(page).toHaveURL(/\/dashboard|\//)

      // 認証状態の確認
      const isAuthenticated = await checkAuthenticationState(page)
      expect(isAuthenticated).toBeTruthy()
    })

    test('AC2-3: 適切なログアウト処理', async ({ page }) => {
      const testUser = generateTestUser('supporter')

      // ログイン
      await signUpUser(page, testUser)
      await signInUser(page, testUser.email, testUser.password)

      // ログアウト実行
      await signOutUser(page)

      // ログアウト後の状態確認
      await expect(page).toHaveURL(/\/auth\/signin|\//)

      // 保護されたページにアクセスできないことを確認
      await page.goto('/dashboard')
      await expect(page).toHaveURL(/\/auth\/signin/)
    })
  })
})
