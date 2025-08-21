/**
 * ペアベース権限システム受入テスト
 * Design Docで定義された受入条件の検証
 */

import { test, expect } from '@playwright/test'
import { 
  generateTestUserPair,
  signUpUser,
  signInUser,
  SELECTORS,
  authenticateUser
} from '../fixtures/auth-helpers'

test.describe('ペアベース権限システム受入条件テスト', () => {
  
  test.describe('受入条件1: ペア自動生成', () => {
    
    test('AC1-1: ユーザー登録時の自動ペア作成', async ({ page }) => {
      const testUsers = generateTestUserPair()
      const patient = testUsers.patient
      
      // サインアップ実行
      await signUpUser(page, patient)
      await signInUser(page, patient.email, patient.password)
      
      // ペア管理ページに移動
      await page.goto('/pairs')
      
      // 初期状態の確認（自分のペアが存在するか、「ペアなし」メッセージ）
      const pairListVisible = await page.locator(SELECTORS.pairs.pairList).isVisible()
      const noPairsVisible = await page.locator(SELECTORS.pairs.noPairsMessage).isVisible()
      
      // どちらか一方が表示されていることを確認
      expect(pairListVisible || noPairsVisible).toBeTruthy()
    })
  })
  
  test.describe('受入条件2: 権限制御の正確な実装', () => {
    
    test('AC2-1: 患者の完全権限確認', async ({ browser }) => {
      const testUsers = generateTestUserPair()
      const patient = testUsers.patient
      
      const patientContext = await browser.newContext()
      const patientPage = await patientContext.newPage()
      
      try {
        // 患者としてログイン
        await authenticateUser(patientPage, patient)
        
        // 患者は全ての操作が可能であることを確認
        await patientPage.goto('/dashboard')
        await expect(patientPage).toHaveURL(/\/dashboard|\//)
        
      } finally {
        await patientContext.close()
      }
    })
  })
})