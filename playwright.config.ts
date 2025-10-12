import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2Eテスト設定
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
	testDir: "./e2e",

	// テストの並列実行設定
	fullyParallel: true,

	// CI環境での設定
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,

	// レポーター設定
	reporter: [
		["html", { outputFolder: "playwright-report" }],
		["list"],
	],

	// 共通の設定
	use: {
		// ベースURL（開発サーバー）
		baseURL: process.env.BASE_URL || "http://localhost:3000",

		// スクリーンショット設定
		screenshot: "only-on-failure",

		// ビデオ録画設定
		video: "retain-on-failure",

		// トレース設定
		trace: "retain-on-failure",
	},

	// テストプロジェクト（ブラウザ設定）
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},

		// モバイルテスト用（必要に応じてコメント解除）
		// {
		// 	name: "mobile-chrome",
		// 	use: { ...devices["Pixel 5"] },
		// },
		// {
		// 	name: "mobile-safari",
		// 	use: { ...devices["iPhone 12"] },
		// },
	],

	// 開発サーバー設定
	webServer: {
		command: "npm run dev",
		url: "http://localhost:3000",
		reuseExistingServer: !process.env.CI,
		stdout: "ignore",
		stderr: "pipe",
	},
});
