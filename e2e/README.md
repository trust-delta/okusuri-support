# E2Eテスト

Playwrightを使用したエンドツーエンドテストです。

## ディレクトリ構造

```
e2e/
├── auth/                    # 認証関連のE2Eテスト
├── invitation/              # 招待機能のE2Eテスト
│   └── invitation-flow.spec.ts
├── dashboard/               # ダッシュボード関連のE2Eテスト
├── helpers/                 # テストヘルパー関数
│   ├── auth.ts             # 認証ヘルパー
│   └── invitation.ts       # 招待機能ヘルパー
└── home.spec.ts            # ホームページのテスト
```

## セットアップ

### ブラウザのインストール

```bash
npx playwright install chromium
```

### 環境変数の設定

テスト実行前に、以下の環境変数を設定してください:

```bash
# ベースURL（オプション、デフォルト: http://localhost:3000）
export BASE_URL=http://localhost:3000

# Convexのデプロイメント（テスト環境用）
export CONVEX_DEPLOYMENT=your-test-deployment
```

## テストの実行

### すべてのE2Eテストを実行

```bash
npm run test:e2e
```

### UIモードで実行（推奨）

```bash
npm run test:e2e:ui
```

UIモードでは、以下が可能です:
- テストの実行状況をリアルタイムで確認
- ブラウザの動作を目視確認
- 失敗したテストのデバッグ
- スクリーンショットやビデオの確認

### デバッグモードで実行

```bash
npm run test:e2e:debug
```

### 特定のテストファイルのみ実行

```bash
npm run test:e2e e2e/invitation/invitation-flow.spec.ts
```

### ヘッドレスモードで実行

```bash
npm run test:e2e -- --headed
```

## テストの書き方

### 基本的なテスト構造

```typescript
import { expect, test } from "@playwright/test";

test.describe("機能名", () => {
  test("テストケース名", async ({ page }) => {
    // ページに移動
    await page.goto("/path");

    // 要素を操作
    await page.click('button:has-text("ボタン")');

    // アサーション
    await expect(page.locator("h1")).toHaveText("期待値");
  });
});
```

### ヘルパー関数の使用

認証や招待機能など、頻繁に使用する操作はヘルパー関数を使用してください:

```typescript
import { test } from "@playwright/test";
import { signIn } from "./helpers/auth";
import { generateInvitationCode } from "./helpers/invitation";

test("招待コードを生成", async ({ page }) => {
  // ログイン
  await signIn(page, "test@example.com", "password");

  // 招待コード生成
  const code = await generateInvitationCode(page);

  // テストロジック...
});
```

### データ属性の使用

テストで要素を特定する際は、`data-testid`属性を使用することを推奨します:

```tsx
// コンポーネント側
<button data-testid="generate-invitation-button">
  招待コードを生成
</button>

// テスト側
await page.click('[data-testid="generate-invitation-button"]');
```

## テスト実行時の動作

### 開発サーバーの自動起動

Playwrightは設定に基づいて自動的に開発サーバーを起動します。
手動でサーバーを起動している場合は、既存のサーバーが再利用されます。

### スクリーンショットとビデオ

- **スクリーンショット**: テスト失敗時に自動的に保存
- **ビデオ**: テスト失敗時のみ保存
- **トレース**: テスト失敗時のみ保存

これらのアーティファクトは `playwright-report/` ディレクトリに保存されます。

## トラブルシューティング

### ブラウザが起動しない

```bash
# ブラウザを再インストール
npx playwright install chromium
```

### タイムアウトエラー

デフォルトのタイムアウトは30秒です。必要に応じて増やしてください:

```typescript
test("長時間かかるテスト", async ({ page }) => {
  // 個別のアクションのタイムアウトを設定
  await page.waitForSelector("selector", { timeout: 60000 });
});
```

または、設定ファイルでグローバルに設定:

```typescript
// playwright.config.ts
export default defineConfig({
  timeout: 60000, // 60秒
});
```

### 認証が必要なテスト

現在、認証のセットアップが必要なテストは `test.skip()` でスキップされています。
認証機能が完成したら、ヘルパー関数を使用して認証を実装してください。

## CI/CDでの実行

GitHub ActionsなどのCI環境では、以下の設定を推奨します:

```yaml
- name: Install dependencies
  run: npm ci

- name: Install Playwright browsers
  run: npx playwright install --with-deps chromium

- name: Run E2E tests
  run: npm run test:e2e
  env:
    CI: true
    BASE_URL: http://localhost:3000
    CONVEX_DEPLOYMENT: ${{ secrets.CONVEX_TEST_DEPLOYMENT }}
```

## 参考資料

- [Playwright公式ドキュメント](https://playwright.dev/docs/intro)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Next.js with Playwright](https://nextjs.org/docs/testing#playwright)
