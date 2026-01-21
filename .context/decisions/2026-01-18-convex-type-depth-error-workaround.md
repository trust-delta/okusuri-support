# 決定記録: Convex型深度エラー（TS2589）対策

**日付**: 2026年01月18日
**ステータス**: 実装完了
**決定者**: 開発チーム

## 背景

Convexの型システムは非常に複雑で、TypeScriptの型インスタンス化深度制限を超過するエラーが頻発します。

```text
error TS2589: Type instantiation is excessively deep and possibly infinite.
```

このエラーは以下の状況で発生します：
- `ctx.runQuery()`, `ctx.runMutation()`, `ctx.runAction()` で `api` / `internal` を参照
- テストファイルでの `t.query()`, `t.mutation()` 呼び出し
- フロントエンドでの `useQuery()`, `useMutation()` 呼び出し（稀に）

また、`noUncheckedIndexedAccess: true` 設定により、配列インデックスアクセスで `TS2532: Object is possibly undefined` エラーも発生します。

## 決定

### 1. TS2589（型深度エラー）の対処

**本番コード**: `@ts-expect-error` を使用し、型情報を保持する

```typescript
const subscriptions = await ctx.runQuery(
  // @ts-expect-error Convex型インスタンス化の深度制限を回避
  internal.push.queries.listByUserId,
  { userId: member.userId },
);
```

**テストコード**: `require()` 動的インポートを使用

```typescript
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const { api, internal } = require("../../_generated/api");
```

### 2. TS2532（undefined可能性エラー）の対処

配列インデックスアクセスにはオプショナルチェイン（`?.`）を使用

```typescript
expect(result[0]?.medicineName).toBe("朝の薬");
```

## 理由

### `@ts-expect-error` を推奨する理由

1. **型情報の保持**: 動的インポートと異なり、APIの戻り値の型が保持される
2. **IDE補完の維持**: エディタでの型補完が引き続き機能する
3. **部分的な適用**: 問題のある箇所のみに適用でき、影響範囲が限定される

### テストで `require()` を使う理由

1. **使用箇所の多さ**: テストファイルでは `api` / `internal` を多数箇所で使用
2. **保守性**: 各行に `@ts-expect-error` を追加するのは冗長
3. **テストの性質**: 型安全性よりも実行確認が主目的

## 利点

✅ **型情報の最大限の保持**: 本番コードでは型補完が維持される
✅ **明示的な回避策**: コメントで意図が明確
✅ **Convex公式推奨**: 循環型推論の回避として公式ドキュメントでも言及
✅ **ビルド・テストへの影響なし**: ランタイムでは正常動作

## 欠点と対応策

❌ **コードの煩雑さ**: `@ts-expect-error` や `require()` が増える
  → **対応**: 明確なコメントで意図を説明、パターンを標準化

❌ **動的インポート時の型情報喪失**: コールバックパラメータに型指定が必要
  → **対応**: 最小限の型アノテーションを追加（`(s: { endpoint: string }) => ...`）

❌ **将来のConvex/TypeScript更新で不要になる可能性**
  → **対応**: 定期的にエラー発生状況を確認、不要になった回避策は削除

## 代替案

### 代替案1: TypeScript設定の緩和

`tsconfig.json` で型チェックを緩和する（`skipLibCheck: true` など）

**却下理由**: 他の型エラーも見逃す可能性があり、型安全性が大幅に低下

### 代替案2: 全ファイルで動的インポート

すべてのファイルで `require()` を使用

**却下理由**: 型情報が完全に失われ、IDE補完も効かなくなる。本番コードでは許容できない

### 代替案3: 型キャスト（`as`）の多用

結果変数に `as SomeType` をキャスト

**却下理由**: 型安全性が低下し、実際の型と不一致の場合にランタイムエラーの原因になる

## 実装例

### 本番コード（actions.ts）

```typescript
import { api, internal } from "../_generated/api";

export const sendToGroup = action({
  handler: async (ctx, args) => {
    const subscriptions = await ctx.runQuery(
      // @ts-expect-error Convex型インスタンス化の深度制限を回避
      internal.push.queries.listByUserId,
      { userId: args.userId },
    );
    // ...
  },
});
```

### テストコード

```typescript
import { convexTest } from "convex-test";
import schema from "../../schema";
import { modules } from "../../test.setup";

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const { api, internal } = require("../../_generated/api");

describe("テスト", () => {
  it("正常系", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(internal.some.query, {});
    expect(result[0]?.property).toBe("expected");
  });
});
```

### フロントエンドコンポーネント

```typescript
"use client";

import { useQuery } from "convex/react";
import { api } from "@/api";

export function MonthlyStatsCard({ groupId, year, month }) {
  const statsResult = useQuery(
    // @ts-expect-error Convex型インスタンス化の深度制限を回避
    api.medications.getMonthlyStats,
    { groupId, year, month },
  );

  // ...
}
```

## 関連ドキュメント

- [Convex公式: Actions - TypeScript Circular Type Inference](https://docs.convex.dev/functions/actions)
- [決定記録: TypeScript型チェックの統一](./2026-01-19-typescript-typecheck-unification.md) - tsc/next build 不整合の解決
- [.context/coding-style.md](../coding-style.md) - 型インスタンス化エラー対策セクション
- [.claude/skills/convex-test-guide/SKILL.md](../../.claude/skills/convex-test-guide/SKILL.md) - テスト用ガイド

## 更新履歴

| 日付 | 更新内容 |
|------|---------|
| 2026-01-18 | 初版作成 |
| 2026-01-19 | フロントエンドコンポーネントの例を追加、関連ドキュメントに型チェック統一の決定記録を追加 |
