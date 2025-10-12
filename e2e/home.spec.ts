import { expect, test } from "@playwright/test";

test.describe("ホームページ", () => {
  test("ホームページが正常に表示される", async ({ page }) => {
    await page.goto("/");

    // ページタイトルが表示されることを確認
    await expect(page).toHaveTitle(/お薬サポート/);
  });

  test("認証されていない状態でダッシュボードにアクセスするとリダイレクトされる", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    // サインインページにリダイレクトされることを確認
    await expect(page).toHaveURL(/login/);
  });
});
