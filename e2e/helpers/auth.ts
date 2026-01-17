import type { Page } from "@playwright/test";
import { type TestUser, testFixtures } from "./fixtures";

/**
 * E2Eテスト用の認証ヘルパー関数
 */

/**
 * メールアドレスとパスワードでサインインする（OTP入力が必要）
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
 * 固定テストアカウントでサインインする
 *
 * 前提条件:
 * - Convex DashboardでTEST_ACCOUNT_EMAIL, TEST_ACCOUNT_FIXED_OTPが設定されていること
 * - fixturesで定義されたテストアカウント情報と一致していること
 *
 * @param page Playwrightのページオブジェクト
 * @param user テストユーザー情報（デフォルト: testFixtures.user）
 */
export async function signInWithTestAccount(
  page: Page,
  user: TestUser = testFixtures.user,
): Promise<void> {
  await page.goto("/login");

  // パスワード認証モードに切り替え
  await page.click('button:has-text("メールアドレスでログイン")');

  // メールアドレスを入力
  await page.fill('input[type="email"]', user.email);

  // パスワードを入力
  await page.fill('input[type="password"]', user.password);

  // ログインボタンをクリック（OTP送信）
  await page.click('button[type="submit"]');

  // OTP入力画面が表示されるのを待つ
  await page.waitForSelector('input[inputmode="numeric"]', { timeout: 10000 });

  // 固定OTPを入力（8桁）
  const otpInputs = page.locator('input[inputmode="numeric"]');
  const otpDigits = user.otp.split("");
  for (let i = 0; i < otpDigits.length; i++) {
    const digit = otpDigits[i];
    if (digit !== undefined) {
      await otpInputs.nth(i).fill(digit);
    }
  }

  // 確認ボタンをクリック
  await page.click('button[type="submit"]');

  // ダッシュボードへのリダイレクトを待つ
  await page.waitForURL(/\/(onboarding|dashboard)/, { timeout: 15000 });
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
