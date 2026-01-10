# Convex セキュリティパターン

## 関数の可視性

| 関数タイプ | クライアントから呼び出し可能 | ユースケース |
|--------------|-----------------|----------|
| `query` | はい | 認証チェック付きの読み取り操作 |
| `mutation` | はい | 認証チェック付きの書き込み操作 |
| `action` | はい | 認証チェック付きの外部 API 呼び出し |
| `internalQuery` | いいえ | サーバー専用の読み取り |
| `internalMutation` | いいえ | サーバー専用の書き込み |
| `internalAction` | いいえ | サーバー専用の外部呼び出し |

## 認証パターン

```typescript
// convex/lib/auth.ts
import { QueryCtx, MutationCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export async function requireAuth(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("認証されていません");
  }
  return userId;
}

export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const userId = await requireAuth(ctx);
  const user = await ctx.db.get(userId);
  if (user?.role !== "admin") {
    throw new Error("アクセス拒否: 管理者権限が必要です");
  }
  return userId;
}
```

## リソース認可パターン

```typescript
// convex/posts.ts
export const updatePost = mutation({
  args: {
    postId: v.id("posts"),
    title: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. 認証チェック
    const userId = await requireAuth(ctx);

    // 2. リソース取得
    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("投稿が見つかりません");
    }

    // 3. 認可チェック
    if (post.authorId !== userId) {
      // 投稿の存在を明かさない - 同じエラー
      throw new Error("投稿が見つかりません");
    }

    // 4. ビジネスルール検証
    if (args.title.length > 200) {
      throw new Error("タイトルが長すぎます");
    }

    // 5. ミューテーション実行
    await ctx.db.patch(args.postId, {
      title: args.title,
      content: args.content,
      updatedAt: Date.now(),
    });
  },
});
```

## 機密操作用の内部関数

```typescript
// convex/billing.ts

// ❌ 間違い: クライアントが任意の userId で呼び出せる
export const addCredits = mutation({
  args: { userId: v.id("users"), amount: v.number() },
  handler: async (ctx, { userId, amount }) => {
    await ctx.db.patch(userId, {
      credits: (await ctx.db.get(userId))!.credits + amount
    });
  },
});

// ✅ 正解: 他のサーバー関数からのみ呼び出し可能
export const addCredits = internalMutation({
  args: { userId: v.id("users"), amount: v.number() },
  handler: async (ctx, { userId, amount }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("ユーザーが見つかりません");
    await ctx.db.patch(userId, { credits: user.credits + amount });
  },
});

// Webhook ハンドラーまたはスケジュールジョブから呼び出し
export const handlePaymentWebhook = action({
  args: { signature: v.string(), payload: v.string() },
  handler: async (ctx, { signature, payload }) => {
    // 決済プロバイダーからの Webhook 署名を検証
    if (!verifySignature(signature, payload)) {
      throw new Error("無効な署名");
    }

    const event = JSON.parse(payload);
    await ctx.runMutation(internal.billing.addCredits, {
      userId: event.userId,
      amount: event.credits,
    });
  },
});
```

## クエリフィルタリング vs 認可

```typescript
// ❌ 間違い: セキュリティをクエリフィルタに依存
export const getTeamPosts = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, { teamId }) => {
    // ユーザーがこのチームのメンバーでない場合は？
    return ctx.db
      .query("posts")
      .withIndex("by_team", (q) => q.eq("teamId", teamId))
      .collect();
  },
});

// ✅ 正解: まずチームメンバーシップを確認
export const getTeamPosts = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, { teamId }) => {
    const userId = await requireAuth(ctx);

    // メンバーシップ確認
    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_user_team", (q) =>
        q.eq("userId", userId).eq("teamId", teamId)
      )
      .first();

    if (!membership) {
      throw new Error("チームメンバーではありません");
    }

    return ctx.db
      .query("posts")
      .withIndex("by_team", (q) => q.eq("teamId", teamId))
      .collect();
  },
});
```

## Convex 引数検証

Convex は実行時に引数の型を検証しますが、ビジネスロジックの検証は引き続き必要です：

```typescript
export const createPost = mutation({
  args: {
    // Convex がこれらの型を検証
    title: v.string(),
    content: v.string(),
    categoryId: v.id("categories"),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    // ビジネスロジック検証は引き続き必要
    if (args.title.trim().length === 0) {
      throw new Error("タイトルは空にできません");
    }
    if (args.title.length > 200) {
      throw new Error("タイトルが長すぎます");
    }

    // カテゴリの存在とユーザーが使用可能か確認
    const category = await ctx.db.get(args.categoryId);
    if (!category || category.isArchived) {
      throw new Error("無効なカテゴリ");
    }

    return ctx.db.insert("posts", {
      ...args,
      authorId: userId,
      createdAt: Date.now(),
    });
  },
});
```

## HTTP Actions（外部 API）

```typescript
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

// 公開 Webhook - 認証の代わりに署名を検証
http.route({
  path: "/webhooks/stripe",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const signature = request.headers.get("stripe-signature");
    const body = await request.text();

    // Stripe のライブラリを使って検証
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
    } catch {
      return new Response("無効な署名", { status: 400 });
    }

    // 検証済みイベントを処理
    await ctx.runMutation(internal.payments.handleEvent, { event });
    return new Response("OK");
  }),
});

export default http;
```

## レート制限パターン

```typescript
// convex/lib/rateLimit.ts
export async function checkRateLimit(
  ctx: MutationCtx,
  key: string,
  limit: number,
  windowMs: number
) {
  const now = Date.now();
  const windowStart = now - windowMs;

  const attempts = await ctx.db
    .query("rateLimits")
    .withIndex("by_key", (q) => q.eq("key", key))
    .filter((q) => q.gt(q.field("timestamp"), windowStart))
    .collect();

  if (attempts.length >= limit) {
    throw new Error("レート制限を超えました");
  }

  await ctx.db.insert("rateLimits", { key, timestamp: now });
}

// 使用例
export const sendMessage = mutation({
  args: { content: v.string() },
  handler: async (ctx, { content }) => {
    const userId = await requireAuth(ctx);

    // ユーザーあたり1分間に10メッセージ
    await checkRateLimit(ctx, `message:${userId}`, 10, 60_000);

    // ... メッセージ送信
  },
});
```
