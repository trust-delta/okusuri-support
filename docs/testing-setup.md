# テスト環境セットアップガイド

## 概要

このプロジェクトでは、以下のテスト環境を整備しています:

- **Vitest**: 高速なユニットテストランナー
- **convex-test**: Convexバックエンド関数のテスト用モック実装
- **React Testing Library**: Reactコンポーネントのテスト
- **happy-dom**: 軽量なDOM実装（テスト環境用）
- **Playwright**: E2Eテスト用ブラウザ自動化ツール

## インストール済みパッケージ

```json
{
  "devDependencies": {
    "@playwright/test": "^1.56.0",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "@vitejs/plugin-react": "^5.0.4",
    "@vitest/ui": "^3.2.4",
    "convex-test": "^0.0.38",
    "happy-dom": "^20.0.0",
    "vitest": "^3.2.4"
  }
}
```

## ディレクトリ構造

```
project-root/
├── convex/
│   ├── invitations/
│   │   └── __tests__/           # 招待機能バックエンドテスト
│   ├── groups/
│   │   └── __tests__/           # グループ機能バックエンドテスト
│   └── medications/
│       └── __tests__/           # 服薬機能バックエンドテスト
├── src/
│   ├── features/
│   │   ├── auth/__tests__/      # 認証機能フロントエンドテスト
│   │   ├── group/__tests__/     # グループ機能フロントエンドテスト
│   │   ├── medication/__tests__/# 服薬機能フロントエンドテスト
│   │   └── onboarding/__tests__/# オンボーディング機能フロントエンドテスト
│   └── __tests__/               # 統合テスト
├── e2e/                         # E2Eテスト
│   ├── auth/                    # 認証関連のE2E
│   ├── invitation/              # 招待機能のE2E
│   ├── dashboard/               # ダッシュボード関連のE2E
│   └── helpers/                 # テストヘルパー関数
├── vitest.config.ts             # Vitest設定ファイル
├── vitest.setup.ts              # テストセットアップファイル
└── playwright.config.ts         # Playwright設定ファイル
```

## テストの実行方法

### すべてのテストを実行

```bash
npm test
```

### ウォッチモードで実行（開発中）

```bash
npm test -- --watch
```

### UIモードで実行

```bash
npm run test:ui
```

### カバレッジレポートを生成

```bash
npm run test:coverage
```

### 特定のディレクトリのテストのみ実行

```bash
# Convexバックエンドテストのみ
npm test convex

# 招待機能のテストのみ
npm test convex/invitations

# グループ機能フロントエンドテストのみ
npm test src/features/group
```

### E2Eテストを実行

```bash
# すべてのE2Eテストを実行
npm run test:e2e

# UIモードで実行（推奨）
npm run test:e2e:ui

# デバッグモードで実行
npm run test:e2e:debug
```

詳細は [e2e/README.md](../e2e/README.md) を参照してください。

## テストの書き方

### Convex関数のテスト（convex-test使用）

```typescript
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../../_generated/api";
import schema from "../../schema";

describe("myMutation", () => {
  it("should create a record", async () => {
    const t = convexTest(schema);

    // テストデータの準備
    const groupId = await t.run(async (ctx) => {
      return await ctx.db.insert("groups", {
        name: "Test Group",
        createdBy: "user123",
        createdAt: Date.now(),
      });
    });

    // mutationの実行
    const result = await t.mutation(api.groups.updateGroup, {
      groupId,
      name: "Updated Group",
    });

    // アサーション
    expect(result).toBeDefined();
    expect(result.name).toBe("Updated Group");
  });
});
```

### Reactコンポーネントのテスト

```typescript
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MyComponent } from "./my-component";

describe("MyComponent", () => {
  it("should render correctly", () => {
    render(<MyComponent title="Test Title" />);

    expect(screen.getByText("Test Title")).toBeInTheDocument();
  });
});
```

## 設定ファイル

### vitest.config.ts

主要な設定:

- **環境**: `happy-dom`（軽量なDOM実装）
- **グローバル変数**: `globals: true`（describe、it、expectなどをインポート不要に）
- **セットアップファイル**: `vitest.setup.ts`
- **convex-test**: `server.deps.inline: ["convex-test"]`（必須設定）

### vitest.setup.ts

- `@testing-library/jest-dom`のインポート
- 各テスト後のクリーンアップ処理

## トラブルシューティング

### `import.meta.glob is not a function` エラー

`vitest.config.ts`に以下を追加してください:

```typescript
test: {
  server: {
    deps: {
      inline: ["convex-test"],
    },
  },
}
```

### Convex認証が必要なテストの場合

テスト内で認証コンテキストを適切にモックしてください:

```typescript
const t = convexTest(schema);

// 認証済みユーザーとしてテストを実行
const userId = await t.run(async (ctx) => {
  return await ctx.db.insert("users", {
    email: "test@example.com",
    name: "Test User",
  });
});

// userIdを使用してmutation/queryを実行
```

## 次のステップ

1. **バックエンドテストの追加**
   - 招待コード検証ロジック
   - Patient単一性制約の検証
   - 重複参加防止ロジック

2. **フロントエンドテストの追加**
   - 招待受け入れUIコンポーネント
   - 招待管理UIコンポーネント
   - カスタムフック

3. **E2Eテストの追加**
   - ✅ Playwright導入済み
   - 招待フローのエンドツーエンドテスト
   - 認証フローのテスト
   - ダッシュボード機能のテスト

## 参考資料

- [Vitest公式ドキュメント](https://vitest.dev/)
- [convex-test GitHub](https://github.com/get-convex/convex-test)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Convex Testing Guide](https://docs.convex.dev/functions/testing)
- [Playwright公式ドキュメント](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
