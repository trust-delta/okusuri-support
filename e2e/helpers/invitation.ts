import type { Page } from "@playwright/test";

/**
 * E2Eテスト用の招待機能ヘルパー関数
 */

/**
 * グループの招待コードを生成する
 * @param page Playwrightのページオブジェクト
 * @returns 生成された招待コード
 */
export async function generateInvitationCode(page: Page): Promise<string> {
	// グループ設定ページに移動
	await page.goto("/settings/group");

	// 招待コード生成ボタンをクリック
	await page.click('button:has-text("招待コードを生成")');

	// 招待コードが表示されるまで待つ
	const codeElement = page.locator('[data-testid="invitation-code"]');
	await codeElement.waitFor({ state: "visible" });

	// 招待コードを取得
	const invitationCode = await codeElement.textContent();

	if (!invitationCode) {
		throw new Error("招待コードの取得に失敗しました");
	}

	return invitationCode.trim();
}

/**
 * 招待コードを使用してグループに参加する
 * @param page Playwrightのページオブジェクト
 * @param invitationCode 招待コード
 * @param displayName 表示名
 * @param role ロール（"patient" または "supporter"）
 */
export async function joinGroupWithInvitation(
	page: Page,
	invitationCode: string,
	displayName: string,
	role: "patient" | "supporter" = "supporter",
): Promise<void> {
	// 招待ページに移動
	await page.goto(`/invite/${invitationCode}`);

	// グループ情報が表示されるまで待つ
	await page.waitForSelector("h1:has-text('グループに参加')");

	// ロールを選択
	await page.click(`input[value="${role}"]`);

	// 表示名を入力
	await page.fill('input[name="displayName"]', displayName);

	// 参加ボタンをクリック
	await page.click('button:has-text("参加する")');

	// ダッシュボードへのリダイレクトを待つ
	await page.waitForURL("/dashboard");
}

/**
 * グループの招待一覧を取得する
 * @param page Playwrightのページオブジェクト
 * @returns 招待コードの配列
 */
export async function getGroupInvitations(page: Page): Promise<string[]> {
	// グループ設定ページに移動
	await page.goto("/settings/group");

	// 招待一覧が表示されるまで待つ
	await page.waitForSelector('[data-testid="invitation-list"]');

	// 招待コードを全て取得
	const invitationElements = page.locator(
		'[data-testid="invitation-list"] [data-testid="invitation-code"]',
	);

	const codes: string[] = [];
	const count = await invitationElements.count();

	for (let i = 0; i < count; i++) {
		const code = await invitationElements.nth(i).textContent();
		if (code) {
			codes.push(code.trim());
		}
	}

	return codes;
}

/**
 * 招待リンクをクリップボードにコピーする
 * @param page Playwrightのページオブジェクト
 * @param invitationCode 招待コード
 */
export async function copyInvitationLink(
	page: Page,
	invitationCode: string,
): Promise<void> {
	// グループ設定ページに移動
	await page.goto("/settings/group");

	// 対象の招待コードのコピーボタンを探してクリック
	const copyButton = page.locator(
		`[data-invitation-code="${invitationCode}"] button:has-text("コピー")`,
	);

	await copyButton.click();

	// コピー成功のトーストが表示されるまで待つ
	await page.waitForSelector('text=コピーしました', { timeout: 3000 });
}
