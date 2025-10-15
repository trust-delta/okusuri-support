# エラーハンドリング

**最終更新**: 2025年10月16日

## エラー処理戦略

### 多層防御

```
クライアント側 → API層 → データ層
バリデーション  認証・認可  スキーマ検証
```

---

## エラーの種類

### 1. バリデーションエラー
**原因**: 不正な入力
**対応**: Zodスキーマ検証

```typescript
const schema = z.object({
  name: z.string().min(1, "必須です").max(50, "50文字以内"),
})
```

### 2. 認証エラー
**原因**: 未認証アクセス
**対応**: 認証状態確認

```typescript
const identity = await ctx.auth.getUserIdentity()
if (!identity) throw new ConvexError("認証が必要です")
```

### 3. 認可エラー
**原因**: 権限不足
**対応**: ロールチェック

```typescript
if (!["admin", "owner"].includes(membership.role)) {
  throw new ConvexError("権限がありません")
}
```

### 4. データ不整合
**原因**: リソース不存在
**対応**: 存在確認

```typescript
const group = await ctx.db.get(groupId)
if (!group) throw new ConvexError("見つかりません")
```

### 5. ネットワークエラー
**原因**: 通信失敗
**対応**: リトライ、エラー表示

---

## フロントエンド

### Error Boundaries

```typescript
// src/app/error.tsx
"use client"

export default function Error({ error, reset }) {
  return (
    <div>
      <h2>エラーが発生しました</h2>
      <p>{error.message}</p>
      <button onClick={reset}>再試行</button>
    </div>
  )
}
```

### Convexエラー

```typescript
import { useMutation } from "convex/react"
import { toast } from "sonner"

const createGroup = useMutation(api.groups.mutations.create)

try {
  await createGroup(data)
  toast.success("作成しました")
} catch (error) {
  toast.error(error.message)
}
```

### フォームエラー

```typescript
<FormField
  name="name"
  render={({ field }) => (
    <FormItem>
      <FormControl>
        <Input {...field} />
      </FormControl>
      <FormMessage /> {/* エラー表示 */}
    </FormItem>
  )}
/>
```

---

## バックエンド

### Convex Error

```typescript
import { ConvexError } from "convex/values"

export const create = mutation({
  handler: async (ctx, args) => {
    // 認証
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new ConvexError("認証が必要です")

    // バリデーション
    if (!args.name) throw new ConvexError("名前は必須です")

    // 重複チェック
    const existing = await ctx.db
      .query("groups")
      .filter(q => q.eq(q.field("name"), args.name))
      .first()

    if (existing) throw new ConvexError("既に存在します")

    return await ctx.db.insert("groups", { name: args.name, ... })
  },
})
```

### エラーログ

```typescript
export function logError(error: Error, context?: Record<string, unknown>) {
  console.error("[ERROR]", {
    message: error.message,
    stack: error.stack,
    ...context,
  })
}
```

---

## ユーザーフィードバック

### Toast通知

```typescript
import { toast } from "sonner"

toast.success("成功しました")
toast.error("失敗しました")
toast.info("情報")
toast.warning("警告")
```

### ローディング状態

```typescript
export function GroupList() {
  const groups = useQuery(api.groups.queries.list)

  if (groups === undefined) return <div>読み込み中...</div>
  if (groups.length === 0) return <div>データがありません</div>

  return <ul>{groups.map(...)}</ul>
}
```

---

## エラーメッセージガイドライン

### DO（推奨）

✅ **具体的** - "1〜50文字で入力してください"
✅ **解決策** - "再度ログインしてください"
✅ **優しい** - "もう一度お試しください"

### DON'T（非推奨）

❌ **技術的** - "NullPointerException"
❌ **曖昧** - "エラーが発生しました"
❌ **攻撃的** - "あなたの入力が間違っています"

---

## 関連ドキュメント

- [プロジェクト概要](project.md)
- [アーキテクチャ](architecture.md)
- [テスト戦略](testing-strategy.md)
