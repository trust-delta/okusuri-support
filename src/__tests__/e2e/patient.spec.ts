import { expect, test } from '@playwright/test'

test.describe('患者ページ', () => {
  test.beforeEach(async ({ page }) => {
    // 患者ページに移動
    await page.goto('/patient')
  })

  test('患者ページが正しく表示される', async ({ page }) => {
    // ページタイトルの確認
    await expect(page.locator('h1')).toContainText('患者情報')

    // テーマトグルボタンが存在することを確認
    await expect(page.locator('[data-testid="theme-toggle"]')).toBeVisible()

    // 患者カードが表示されることを確認
    await expect(page.locator('[data-testid="patient-card"]')).toBeVisible()
  })

  test('患者情報が正しく表示される', async ({ page }) => {
    // 患者名の確認
    await expect(page.locator('[data-testid="patient-name"]')).toContainText('田中 太郎')

    // 患者年齢の確認
    await expect(page.locator('[data-testid="patient-age"]')).toContainText('45歳')

    // 薬剤情報が表示されることを確認
    const medicationCards = page.locator('[data-testid="medication-card"]')
    await expect(medicationCards).toHaveCount(2)

    // 薬剤名が正しく表示されることを確認
    await expect(medicationCards.first()).toContainText('ロキソニン')
    await expect(medicationCards.nth(1)).toContainText('ガスター10')
  })

  test('患者アクションが実行可能', async ({ page }) => {
    // 薬剤追加ボタンが存在することを確認
    const addMedicationButton = page.locator('[data-testid="add-medication"]')
    await expect(addMedicationButton).toBeVisible()

    // 薬剤追加ボタンをクリック
    await addMedicationButton.click()

    // ダイアログが開くことを確認（実装されている場合）
    // 注意: 実際のダイアログ実装に応じて調整が必要
  })

  test('薬剤服用記録が実行可能', async ({ page }) => {
    // 薬剤服用ボタンが存在することを確認
    const takeMedicationButtons = page.locator('[data-testid="take-medication"]')
    await expect(takeMedicationButtons.first()).toBeVisible()

    // 最初の薬剤の服用ボタンをクリック
    await takeMedicationButtons.first().click()

    // 服用記録が更新されることを確認（実装に応じて調整）
    // 例: 成功メッセージやステータス変更の確認
  })

  test('患者ページのレスポンシブデザイン', async ({ page }) => {
    // モバイルサイズでの表示確認
    await page.setViewportSize({ width: 375, height: 667 })

    // 患者カードが適切に表示されることを確認
    await expect(page.locator('[data-testid="patient-card"]')).toBeVisible()

    // ナビゲーション要素が適切に表示されることを確認
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('[data-testid="theme-toggle"]')).toBeVisible()

    // デスクトップサイズに戻す
    await page.setViewportSize({ width: 1280, height: 720 })

    // 要素が適切に再配置されることを確認
    await expect(page.locator('[data-testid="patient-card"]')).toBeVisible()
  })

  test('ページの読み込み性能', async ({ page }) => {
    // ページ読み込み開始
    const startTime = Date.now()
    await page.goto('/patient')

    // 主要要素の表示を待機
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('[data-testid="patient-card"]')).toBeVisible()

    const loadTime = Date.now() - startTime

    // 読み込み時間が5秒以内であることを確認
    expect(loadTime).toBeLessThan(5000)
  })
})
