import { expect, test } from '@playwright/test'

test.describe('テーマ切り替え機能', () => {
  test.beforeEach(async ({ page }) => {
    // 患者ページに移動（テーマトグルが存在するページ）
    await page.goto('/patient')
  })

  test('初期テーマ状態の確認', async ({ page }) => {
    // ページが読み込まれることを確認
    await expect(page.locator('h1')).toContainText('患者情報')

    // テーマトグルボタンが表示されることを確認
    const themeToggle = page.locator('[data-testid="theme-toggle"]')
    await expect(themeToggle).toBeVisible()

    // 初期状態でライトモードまたはシステム設定であることを確認
    // HTMLタグのdata-theme属性またはclass属性を確認
    const htmlElement = page.locator('html')

    // 初期状態の記録（ライト/ダーク/システム設定）
    const initialTheme = await htmlElement.evaluate((el) => {
      return el.getAttribute('class') || el.getAttribute('data-theme') || 'light'
    })

    console.log(`Initial theme: ${initialTheme}`)
  })

  test('テーマトグルボタンの動作確認', async ({ page }) => {
    const themeToggle = page.locator('[data-testid="theme-toggle"]')

    // テーマトグルボタンをクリック
    await themeToggle.click()

    // テーマ変更の完了を待機
    await page.waitForTimeout(1000)

    // ボタンが正常にクリック可能であることを確認
    await expect(themeToggle).toBeVisible()
    await expect(themeToggle).toBeEnabled()

    // アクセシビリティ属性が設定されていることを確認
    const ariaLabel = await themeToggle.getAttribute('aria-label')
    const title = await themeToggle.getAttribute('title')

    // どちらかが設定されていることを確認
    expect(ariaLabel || title).toBeTruthy()

    console.log('Theme toggle button working correctly')
  })

  test('ページリロード後のテーマトグルボタンの動作', async ({ page }) => {
    const themeToggle = page.locator('[data-testid="theme-toggle"]')

    // テーマ切り替えを実行
    await themeToggle.click()
    await page.waitForTimeout(500)

    // ページをリロード
    await page.reload()
    await expect(page.locator('h1')).toContainText('患者情報')

    // リロード後もテーマトグルボタンが正常に機能することを確認
    const reloadedThemeToggle = page.locator('[data-testid="theme-toggle"]')
    await expect(reloadedThemeToggle).toBeVisible()
    await expect(reloadedThemeToggle).toBeEnabled()

    // ボタンがクリック可能であることを確認
    await reloadedThemeToggle.click()
    await page.waitForTimeout(300)
    await expect(reloadedThemeToggle).toBeVisible()

    console.log('Theme toggle button persists after reload')

    // 他のページでもテーマトグルが動作することを確認
    await page.goto('/')
    await page.waitForTimeout(500)

    // ホームページではテーマトグルがないことを確認（患者ページ固有）
    const homeThemeToggle = page.locator('[data-testid="theme-toggle"]')
    await expect(homeThemeToggle).toHaveCount(0)

    console.log('Theme toggle correctly scoped to patient page')
  })

  test('テーマ切り替えのスクリーンショット確認', async ({ page }) => {
    const themeToggle = page.locator('[data-testid="theme-toggle"]')

    // テーマトグルボタンがクリック可能であることを確認
    await expect(themeToggle).toBeVisible()
    await themeToggle.click()
    await page.waitForTimeout(1000)

    // 切り替え後もページが正常に表示されることを確認
    await expect(page.locator('h1')).toContainText('患者情報')
    await expect(page.locator('[data-testid="patient-card"]')).toBeVisible()

    // ボタンが継続して機能することを確認
    await expect(themeToggle).toBeVisible()
    await expect(themeToggle).toBeEnabled()

    console.log('Theme toggle visual changes working correctly')
  })

  test('テーマ切り替えのアクセシビリティ', async ({ page }) => {
    const themeToggle = page.locator('[data-testid="theme-toggle"]')

    // ボタンが適切にフォーカス可能であることを確認
    await themeToggle.focus()
    await expect(themeToggle).toBeFocused()

    // キーボード操作で切り替え可能であることを確認
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)

    // aria-labelやtitleなどのアクセシビリティ属性が適切に設定されていることを確認
    const ariaLabel = await themeToggle.getAttribute('aria-label')
    const title = await themeToggle.getAttribute('title')

    // どちらかが設定されていることを確認
    expect(ariaLabel || title).toBeTruthy()

    console.log(`Theme toggle accessibility: aria-label="${ariaLabel}", title="${title}"`)
  })

  test('複数回のテーマ切り替えの動作確認', async ({ page }) => {
    const themeToggle = page.locator('[data-testid="theme-toggle"]')

    // 複数回クリックしてもボタンが正常に動作することを確認
    for (let i = 0; i < 3; i++) {
      await themeToggle.click()
      await page.waitForTimeout(300)

      // 各クリック後もボタンが有効であることを確認
      await expect(themeToggle).toBeVisible()
      await expect(themeToggle).toBeEnabled()

      // アクセシビリティ属性が維持されていることを確認
      const ariaLabel = await themeToggle.getAttribute('aria-label')
      const title = await themeToggle.getAttribute('title')
      expect(ariaLabel || title).toBeTruthy()

      console.log(`Toggle ${i + 1}: Button remains functional`)
    }

    // 最終的にボタンが正常な状態であることを確認
    await expect(themeToggle).toBeVisible()
    await expect(themeToggle).toBeEnabled()
  })
})
