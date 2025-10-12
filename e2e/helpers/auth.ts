import type { Page } from "@playwright/test";

/**
 * E2Eテスト用の認証ヘルパー関数
 */

/**
 * メールアドレスとパスワードでサインインする
 */
export async function signIn(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/sign-in");

  // メールアドレスを入力
  await page.fill('input[type="email"]', email);

  // パスワードを入力
  await page.fill('input[type="password"]', password);

  // サインインボタンをクリック
  await page.click('button[type="submit"]');

  // ダッシュボードへのリダイレクトを待つ
  await page.waitForURL("/dashboard");
}

/**
 * サインアウトする
 */
export async function signOut(page: Page): Promise<void> {
  // ユーザーメニューを開く
  await page.click('[data-testid="user-menu"]');

  // サインアウトボタンをクリック
  await page.click('button:has-text("サインアウト")');

  // サインインページへのリダイレクトを待つ
  await page.waitForURL("/sign-in");
}

/**
 * テストユーザーを作成してサインインする
 * @param page Playwrightのページオブジェクト
 * @param userType ユーザータイプ（例: "patient", "supporter"）
 */
export async function createTestUserAndSignIn(
  page: Page,
  userType: "patient" | "supporter" = "supporter",
): Promise<{
  email: string;
  password: string;
  displayName: string;
}> {
  const timestamp = Date.now();
  const email = `test-${userType}-${timestamp}@example.com`;
  const password = "TestPassword123!";
  const displayName = `Test ${userType} ${timestamp}`;

  await page.goto("/sign-up");

  // サインアップフォームに入力
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.fill('input[name="displayName"]', displayName);

  // サインアップボタンをクリック
  await page.click('button[type="submit"]');

  // オンボーディングまたはダッシュボードへのリダイレクトを待つ
  await page.waitForURL(/\/(onboarding|dashboard)/);

  return { email, password, displayName };
}
