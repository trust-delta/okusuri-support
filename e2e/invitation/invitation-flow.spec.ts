import { expect, test } from "@playwright/test";

test.describe("招待機能のE2Eフロー", () => {
	test.skip("招待コードを生成して共有できる", async ({ page }) => {
		// TODO: 認証のセットアップが必要
		// このテストは実装時にskipを解除

		// 1. ログイン
		await page.goto("/sign-in");
		// ログイン処理...

		// 2. グループ設定ページに移動
		await page.goto("/settings/group");

		// 3. 招待コード生成ボタンをクリック
		await page.click('button:has-text("招待コードを生成")');

		// 4. 招待コードが表示されることを確認
		const invitationCode = await page.locator('[data-testid="invitation-code"]');
		await expect(invitationCode).toBeVisible();

		// 5. クリップボードにコピーボタンが動作することを確認
		const copyButton = page.locator('button:has-text("コピー")');
		await copyButton.click();

		// 6. コピー成功のトーストが表示されることを確認
		await expect(page.locator('text=コピーしました')).toBeVisible();
	});

	test.skip("招待リンクから参加できる", async ({ page, context }) => {
		// TODO: 認証とテストデータのセットアップが必要
		// このテストは実装時にskipを解除

		// 1. 招待コードを使用して招待ページにアクセス
		const testInvitationCode = "TEST1234";
		await page.goto(`/invite/${testInvitationCode}`);

		// 2. グループ情報が表示されることを確認
		await expect(page.locator("h1")).toContainText("グループに参加");

		// 3. ロール選択
		await page.click('input[value="supporter"]');

		// 4. 表示名を入力
		await page.fill('input[name="displayName"]', "テストサポーター");

		// 5. 参加ボタンをクリック
		await page.click('button:has-text("参加する")');

		// 6. ダッシュボードにリダイレクトされることを確認
		await expect(page).toHaveURL("/dashboard");

		// 7. グループメンバーとして表示されることを確認
		await expect(page.locator("text=テストサポーター")).toBeVisible();
	});

	test("無効な招待コードでエラーが表示される", async ({ page }) => {
		// 存在しない招待コードでアクセス
		await page.goto("/invite/INVALID123");

		// エラーメッセージが表示されることを確認
		await expect(
			page.locator("text=無効な招待コードです"),
		).toBeVisible();
	});
});
