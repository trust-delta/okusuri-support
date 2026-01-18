# エラーハンドリング

**最終更新**: 2026年01月17日

## エラー処理戦略

### 多層防御

```
クライアント側 → API層 → データ層
バリデーション  認証・認可  スキーマ検証
```

---

## Result型パターン

本プロジェクトでは、Convex mutation/action の戻り値に **Result型パターン** を採用しています。例外をスローする代わりに、成功/失敗を明示的に返すことで型安全なエラーハンドリングを実現します。

### Result型の定義

```typescript
// convex/types/result.ts
interface SuccessResult<T> {
  isSuccess: true;
  data: T;
}

interface ErrorResult {
  isSuccess: false;
  errorMessage: string;
}

export type Result<S> = SuccessResult<S> | ErrorResult;

// ヘルパー関数
export const success = <T>(data: T): SuccessResult<T> => ({
  isSuccess: true,
  data,
});

export const error = (errorMessage: string): ErrorResult => ({
  isSuccess: false,
  errorMessage,
});
```

### バックエンドでの使用例

```typescript
// convex/groups/mutations.ts
import { error, type Result, success } from "../types/result";

export const createGroup = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Result<Id<"groups">>> => {
    // 1. 認証確認
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return error("認証が必要です");
    }

    // 2. バリデーション
    if (!args.name || args.name.trim() === "") {
      return error("グループ名は必須です");
    }

    // 3. データ作成
    const groupId = await ctx.db.insert("groups", {
      name: args.name.trim(),
      description: args.description?.trim(),
      createdBy: userId,
      createdAt: Date.now(),
    });

    return success(groupId);
  },
});
```

### クライアント側での処理

```typescript
"use client";

import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/lib/convex";

export function CreateGroupButton() {
  const createGroup = useMutation(api.groups.mutations.createGroup);
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async (name: string) => {
    setIsLoading(true);
    try {
      const result = await createGroup({ name });

      if (result.isSuccess) {
        toast.success("グループを作成しました");
        // result.data にアクセス可能
      } else {
        toast.error(result.errorMessage);
      }
    } catch (error) {
      // ネットワークエラーなどの予期しないエラー
      toast.error("予期しないエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button onClick={() => handleCreate("新しいグループ")} disabled={isLoading}>
      {isLoading ? "作成中..." : "グループ作成"}
    </Button>
  );
}
```

---

## Zod 境界バリデーション

convex-helpers を使用して、Convex 関数の引数に Zod スキーマによる境界バリデーションを適用できます。フロントエンドと同じ Zod スキーマを使用することで、型安全性と一貫したバリデーションを実現します。

### 関数ビルダー

```typescript
// convex/functions.ts で定義
import { zQuery, zMutation, zAction, zid } from "@/convex/functions";
```

| ビルダー | 用途 |
|----------|------|
| `zQuery` | Zod バリデーション付き query |
| `zMutation` | Zod バリデーション付き mutation |
| `zAction` | Zod バリデーション付き action |
| `zInternalQuery` | 内部 query |
| `zInternalMutation` | 内部 mutation |
| `zInternalAction` | 内部 action |
| `zid("tableName")` | Document ID バリデーター |

### 使用例

```typescript
import { z } from "zod/v4";
import { zid, zMutation } from "../functions";
import { error, type Result, success } from "../types/result";

export const updateGroup = zMutation({
  args: {
    groupId: zid("groups"),
    name: z.string()
      .min(1, "グループ名を入力してください")
      .max(100, "グループ名は100文字以内")
      .optional(),
    description: z.string()
      .max(500, "説明は500文字以内")
      .optional(),
  },
  handler: async (ctx, args): Promise<Result<void>> => {
    // Zod バリデーションは args が handler に渡される前に実行される
    // args は既にバリデーション済み
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return error("認証が必要です");
    }
    // ...
  },
});
```

### 従来の `v` バリデーターとの違い

| 観点 | `v` (Convex標準) | `z` (Zod) |
|------|------------------|-----------|
| エラーメッセージ | 自動生成（英語） | カスタマイズ可能 |
| フロントエンドとの共有 | 不可 | 可能 |
| 複雑なバリデーション | 限定的 | 柔軟 |
| 型推論 | 良好 | 良好 |

### 注意事項

- `z` は `zod/v4` からインポートすること（Zod 4.x 構文）
- 既存の `v` バリデーターを使用する関数はそのまま動作する
- 新規関数では `zMutation`, `zQuery` の使用を推奨

---

## エラーの種類

### 1. バリデーションエラー
**原因**: 不正な入力
**対応**: Zodスキーマ検証 + Result型で返却

```typescript
// クライアント側バリデーション
const schema = z.object({
  name: z.string().min(1, "必須です").max(50, "50文字以内"),
});

// サーバー側バリデーション（Zod境界バリデーション使用時は不要）
// Zod でバリデーション済みの場合、手動チェックは省略可能
```

### 2. 認証エラー
**原因**: 未認証アクセス
**対応**: 認証状態確認

```typescript
const userId = await getAuthUserId(ctx);
if (!userId) {
  return error("認証が必要です");
}
```

### 3. 認可エラー
**原因**: 権限不足
**対応**: ロールチェック

```typescript
const membership = await ctx.db
  .query("groupMembers")
  .withIndex("by_userId", (q) => q.eq("userId", userId))
  .filter((q) => q.eq(q.field("groupId"), args.groupId))
  .first();

if (!membership) {
  return error("このグループのメンバーではありません");
}
```

### 4. データ不整合
**原因**: リソース不存在
**対応**: 存在確認

```typescript
const group = await ctx.db.get(args.groupId);
if (!group) {
  return error("グループが見つかりません");
}
```

### 5. ネットワークエラー
**原因**: 通信失敗
**対応**: try-catchで捕捉、リトライ表示

---

## フロントエンド

### Error Boundaries

```typescript
// app/error.tsx
"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-xl font-bold">エラーが発生しました</h2>
      <p className="text-muted-foreground">{error.message}</p>
      <Button onClick={reset} className="mt-4">
        再試行
      </Button>
    </div>
  );
}
```

### Result型の処理パターン

```typescript
const result = await mutation(args);

if (result.isSuccess) {
  // 成功時の処理
  toast.success("成功しました");
  const data = result.data; // 型安全にアクセス
} else {
  // エラー時の処理
  toast.error(result.errorMessage);
}
```

### フォームエラー

```typescript
<FormField
  name="name"
  render={({ field }) => (
    <FormItem>
      <FormLabel>名前</FormLabel>
      <FormControl>
        <Input {...field} />
      </FormControl>
      <FormMessage /> {/* Zodエラー表示 */}
    </FormItem>
  )}
/>
```

---

## バックエンド

### 処理順序の原則

**検証順序**: 認証 → 権限 → 入力検証 → ビジネスロジック

```typescript
handler: async (ctx, args): Promise<Result<Id<"groups">>> => {
  // 1. 認証確認
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    return error("認証が必要です");
  }

  // 2. 権限確認
  const membership = await ctx.db
    .query("groupMembers")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .filter((q) => q.eq(q.field("groupId"), args.groupId))
    .first();

  if (!membership) {
    return error("このグループのメンバーではありません");
  }

  // 3. 入力検証
  if (!args.name || args.name.trim() === "") {
    return error("名前は必須です");
  }

  // 4. ビジネスロジック
  const id = await ctx.db.insert("groups", { ... });
  return success(id);
}
```

### 戻り値の型注釈

必ず `Promise<Result<T>>` の型注釈を付けること。

```typescript
// ✅ 推奨
handler: async (ctx, args): Promise<Result<Id<"groups">>> => { ... }

// ❌ 非推奨（型注釈なし）
handler: async (ctx, args) => { ... }
```

---

## ユーザーフィードバック

### Toast通知

```typescript
import { toast } from "sonner";

// 成功
toast.success("保存しました");

// エラー
toast.error("保存に失敗しました");

// Result型から
if (result.isSuccess) {
  toast.success("作成しました");
} else {
  toast.error(result.errorMessage);
}
```

### ローディング状態

```typescript
export function GroupList() {
  const groups = useQuery(api.groups.queries.list);

  if (groups === undefined) return <Skeleton />;
  if (groups.length === 0) return <EmptyState />;

  return <ul>{groups.map(...)}</ul>;
}
```

---

## エラーメッセージガイドライン

### DO（推奨）

✅ **具体的** - 「1〜50文字で入力してください」
✅ **解決策** - 「再度ログインしてください」
✅ **優しい** - 「もう一度お試しください」

### DON'T（非推奨）

❌ **技術的** - 「NullPointerException」
❌ **曖昧** - 「エラーが発生しました」
❌ **攻撃的** - 「あなたの入力が間違っています」

---

## テストでのモック

```typescript
// 成功
mockMutation.mockResolvedValue({ isSuccess: true, data: { id: "123" } });

// 失敗
mockMutation.mockResolvedValue({ isSuccess: false, errorMessage: "エラー" });

// 予期しないエラー（ネットワークエラーなど）
mockMutation.mockRejectedValue(new Error("ネットワークエラー"));
```

---

## 関連ドキュメント

- [プロジェクト概要](project.md)
- [アーキテクチャ](architecture.md)
- [テスト戦略](testing-strategy.md)
