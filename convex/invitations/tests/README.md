# Invitations機能のバックエンドテスト

このディレクトリには、招待機能のConvex mutation/query/actionのテストが含まれます。

## テスト対象

- Actions
  - 招待コード生成 (generateInvitationCodeAction)

- Mutations
  - createInvitation（招待作成）
  - joinGroupWithInvitation（招待コードでグループ参加）

- Queries
  - validateInvitation（招待コード検証）
  - listGroupInvitations（グループの招待一覧）

## 実行方法

```bash
# すべてのテストを実行
npm test

# Convex関連のテストのみ実行
npm test convex

# 招待機能のテストのみ実行
npm test convex/invitations
```

## テストの書き方

### convex-testの基本パターン

```typescript
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../../_generated/api";
import schema from "../../schema";

describe("myMutation", () => {
  it("should do something", async () => {
    const t = convexTest(schema);

    // テストデータの準備
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", { name: "Test User" });
    });

    // mutationの実行
    const result = await t.mutation(api.myModule.myMutation, {
      userId,
      data: "test",
    });

    // アサーション
    expect(result).toBeDefined();
  });
});
```

## 注意事項

- `convex-test`はインメモリデータベースを使用
- 各テストは独立したデータベース状態で実行される
- 認証が必要なテストは、適切にユーザーコンテキストをセットアップすること
