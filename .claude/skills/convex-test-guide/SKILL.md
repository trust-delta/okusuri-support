---
name: convex-test-guide
description: Convexバックエンドのテスト作成ガイド。convex-testのセットアップ、パターン、Result型のテスト方法を提供する。
---

# Convex Test Guide

Convexバックエンドのテスト作成に関するガイド。

## セットアップ

### 1. 共通テストセットアップファイル

`convex/test.setup.ts` を作成：

```typescript
import { convexTest } from "convex-test";
import schema from "./schema";

// モジュールを動的にインポート
const modules = import.meta.glob("./**/*.ts", { eager: true });

export function createTestContext() {
  return convexTest(schema, modules);
}
```

### 2. vitest.config.ts の設定

```typescript
export default defineConfig({
  test: {
    // convexディレクトリを含める
    include: ["**/*.test.ts", "**/*.test.tsx"],
  },
});
```

---

## テストパターン

### 基本的なクエリテスト

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { createTestContext } from "../../test.setup";
import { api } from "../../_generated/api";

describe("グループクエリ", () => {
  let t: ReturnType<typeof createTestContext>;

  beforeEach(() => {
    t = createTestContext();
  });

  it("ユーザーのグループ一覧を取得できる", async () => {
    // セットアップ
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        clerkId: "test-clerk-id",
        email: "test@example.com",
      });
    });

    // 実行
    const groups = await t.query(api.groups.queries.list, { userId });

    // 検証
    expect(groups).toHaveLength(0);
  });
});
```

### Mutation テスト

```typescript
it("グループを作成できる", async () => {
  // ユーザーを作成
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      clerkId: "test-clerk-id",
      email: "test@example.com",
    });
  });

  // Mutation実行（認証をモック）
  const result = await t.mutation(
    api.groups.mutations.create,
    { name: "テストグループ" },
    { auth: { userId: "test-clerk-id" } }
  );

  // Result型の検証
  expect(result.isSuccess).toBe(true);
  if (result.isSuccess) {
    expect(result.data).toBeDefined();
  }
});
```

---

## Result型のテスト

このプロジェクトはResult型パターンを使用しています。

### 成功ケース

```typescript
it("成功時はisSuccess: trueを返す", async () => {
  const result = await t.mutation(api.groups.create, { name: "Test" });

  expect(result.isSuccess).toBe(true);
  if (result.isSuccess) {
    expect(result.data.groupId).toBeDefined();
  }
});
```

### 失敗ケース

```typescript
it("バリデーションエラー時はisSuccess: falseを返す", async () => {
  const result = await t.mutation(api.groups.create, { name: "" });

  expect(result.isSuccess).toBe(false);
  if (!result.isSuccess) {
    expect(result.errorMessage).toBe("グループ名を入力してください");
  }
});
```

### 型安全な検証ヘルパー

```typescript
// テストヘルパー
function assertSuccess<T>(result: Result<T>): asserts result is SuccessResult<T> {
  expect(result.isSuccess).toBe(true);
}

function assertFailure(result: Result<unknown>): asserts result is FailureResult {
  expect(result.isSuccess).toBe(false);
}

// 使用例
it("グループを作成できる", async () => {
  const result = await t.mutation(api.groups.create, { name: "Test" });
  assertSuccess(result);
  expect(result.data.groupId).toBeDefined();
});
```

---

## 認証のモック

### Clerkユーザーとして実行

```typescript
// 認証済みユーザーとして実行
const result = await t.mutation(
  api.groups.create,
  { name: "Test" },
  { auth: { userId: "clerk-user-id" } }
);
```

### 未認証として実行

```typescript
// 認証なしで実行（エラーを期待）
const result = await t.mutation(api.groups.create, { name: "Test" });
expect(result.isSuccess).toBe(false);
expect(result.errorMessage).toBe("認証が必要です");
```

---

## テストデータのセットアップ

### ヘルパー関数

```typescript
// テストヘルパー
async function createTestUser(t: TestContext) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      clerkId: `test-${Date.now()}`,
      email: `test-${Date.now()}@example.com`,
    });
  });
}

async function createTestGroup(t: TestContext, ownerId: Id<"users">) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("groups", {
      name: "テストグループ",
      ownerId,
    });
  });
}
```

---

## ディレクトリ構造

```
convex/
├── test.setup.ts          # 共通セットアップ
├── groups/
│   ├── mutations.ts
│   ├── queries.ts
│   └── tests/
│       ├── mutations.test.ts
│       └── queries.test.ts
└── users/
    ├── mutations.ts
    └── tests/
        └── mutations.test.ts
```

---

## 注意事項

1. **`_generated` ディレクトリを除外**: テストモジュールのglobパターンで `_generated` を除外
2. **テストの独立性**: 各テストは独立して実行可能に（beforeEachでリセット）
3. **Result型の一貫性**: すべてのMutationはResult型を返す
