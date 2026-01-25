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

## Convex型エラー対処パターン（TS2589）

Convexの型システムは複雑なため、TypeScriptの型インスタンス化深度制限（TS2589: Type instantiation is excessively deep）が発生することがあります。

### エラーの原因

```text
error TS2589: Type instantiation is excessively deep and possibly infinite.
```

このエラーは `api` や `internal` を参照する箇所で発生します。特に `ctx.runQuery()`, `ctx.runMutation()`, `ctx.runAction()`, `t.query()`, `t.mutation()` などで頻発します。

### 対処法1: `@ts-expect-error`（推奨：本番コード）

**型情報を保持**しつつエラーを回避できます。エラーが発生する式の**直前**に配置します。

```typescript
// ✅ 正しい位置（エラーが発生する式の直前）
const subscriptions = await ctx.runQuery(
  // @ts-expect-error Convex型インスタンス化の深度制限を回避
  internal.push.queries.listByUserId,
  { userId: member.userId },
);

// ❌ 効かない位置（ステートメント全体の前では複数行に適用されない）
// @ts-expect-error
const subscriptions = await ctx.runQuery(
  internal.push.queries.listByUserId,  // エラーはここで発生
  { userId: member.userId },
);
```

### 対処法2: 動的インポート（推奨：テストコード）

テストファイルのように**使用箇所が多い**場合は、`require()` による動的インポートが有効です。

```typescript
// ❌ 通常のimport（型深度エラーが発生する可能性）
import { api, internal } from "../../_generated/api";

// ✅ 動的インポート（型深度エラーを回避）
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const { api, internal } = require("../../_generated/api");
```

**注意**: 動的インポートを使うと型情報が失われるため、コールバックパラメータに明示的な型アノテーションが必要になる場合があります。

```typescript
// 型情報がないため、パラメータに型を指定
expect(
  result.map((s: { endpoint: string }) => s.endpoint),
).toContain("https://example.com");

// findのコールバックも同様
const group = result.find(
  (g: { settings: { morningTime: number } }) =>
    g.settings.morningTime === 420,
);
```

### 対処法の使い分け

| ケース | 推奨対処法 | 理由 |
|--------|-----------|------|
| **本番コード**（actions, mutations, queries） | `@ts-expect-error` | 型情報を保持できる |
| **フロントエンドコンポーネント** | `@ts-expect-error` | 型情報を保持できる |
| **テストファイル** | `require()` 動的インポート | 使用箇所が多く、各行に追加するのは冗長 |

### 配列インデックスアクセスの型エラー（TS2532）

`noUncheckedIndexedAccess: true` が有効な場合、配列のインデックスアクセスで `Object is possibly undefined` エラーが発生します。

```typescript
// ❌ エラー: Object is possibly undefined
expect(result[0].medicineName).toBe("朝の薬");

// ✅ オプショナルチェインを使用
expect(result[0]?.medicineName).toBe("朝の薬");
```

---

## 注意事項

1. **`_generated` ディレクトリを除外**: テストモジュールのglobパターンで `_generated` を除外
2. **テストの独立性**: 各テストは独立して実行可能に（beforeEachでリセット）
3. **Result型の一貫性**: すべてのMutationはResult型を返す
4. **型深度エラー対策**: テストファイルでは動的インポートを推奨
5. **型チェックの統一**: Convex の型チェックは `pnpm run typecheck:convex` で実行（`tsc --noEmit -p convex/tsconfig.json`）

---

## 型チェックについて

Convex バックエンドの型チェックは、ルート `tsconfig.json` とは分離されています。

```bash
# Convex の型チェック
pnpm run typecheck:convex
```

テストファイルは `convex/tsconfig.json` の対象外のため、`require()` 動的インポートを使用しても型チェックエラーにはなりません。

> 詳細: [決定記録: TypeScript型チェックの統一](../../.context/decisions/2026-01-19-typescript-typecheck-unification.md)
