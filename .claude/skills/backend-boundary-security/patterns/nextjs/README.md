# Next.js セキュリティパターン

## Server Actions: 公開 HTTP エンドポイント

`"use server"` ファイル内のエクスポートされた関数はすべて**公開 HTTP エンドポイント**です。

```typescript
// app/actions.ts
"use server";

// ❌ これは HTTP POST 経由で誰でも呼び出し可能
export async function deleteUser(userId: string) {
  await db.users.delete(userId);  // 攻撃者は任意の userId を渡せる！
}
```

アクション ID はクライアントバンドルとネットワークリクエスト（`Next-Action` ヘッダー）で確認できます。

## Data Access Layer (DAL) パターン

認可チェック付きのすべてのデータアクセスを一元化：

```typescript
// lib/dal.ts
import "server-only";  // クライアントでの誤ったインポートを防止
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// メモ化されたセッション検証
export const verifySession = cache(async () => {
  const cookie = (await cookies()).get("session")?.value;
  const session = await decrypt(cookie);

  if (!session?.userId) {
    redirect("/login");
  }

  return { userId: session.userId, role: session.role };
});

// 認可を強制するデータアクセス関数
export async function getPost(postId: string) {
  const { userId } = await verifySession();

  const post = await db.posts.findUnique({ where: { id: postId } });
  if (!post) return null;

  // ユーザーがこの投稿にアクセスできるか確認
  if (post.authorId !== userId && !post.isPublic) {
    return null;  // 存在を明かさない
  }

  return post;
}

export async function updatePost(postId: string, data: PostUpdateInput) {
  const { userId } = await verifySession();

  const post = await db.posts.findUnique({ where: { id: postId } });
  if (!post || post.authorId !== userId) {
    throw new Error("見つかりません");
  }

  return db.posts.update({ where: { id: postId }, data });
}
```

## DAL を使用した Server Action パターン

```typescript
// app/posts/actions.ts
"use server";

import { z } from "zod";
import { updatePost } from "@/lib/dal";
import { revalidatePath } from "next/cache";

const UpdatePostSchema = z.object({
  postId: z.string().uuid(),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(50000),
});

export async function updatePostAction(formData: FormData) {
  // 1. 入力をパースして検証
  const rawData = {
    postId: formData.get("postId"),
    title: formData.get("title"),
    content: formData.get("content"),
  };

  const result = UpdatePostSchema.safeParse(rawData);
  if (!result.success) {
    return { error: "無効な入力", issues: result.error.issues };
  }

  // 2. DAL が認証 + 認可を処理
  try {
    await updatePost(result.data.postId, {
      title: result.data.title,
      content: result.data.content,
    });
  } catch (error) {
    return { error: "投稿の更新に失敗しました" };
  }

  // 3. キャッシュを再検証
  revalidatePath(`/posts/${result.data.postId}`);
  return { success: true };
}
```

## 型安全性は実行時の安全性ではない

```typescript
// ❌ TypeScript の型は実行時に消去される
export async function transferMoney(
  fromAccount: string,
  toAccount: string,
  amount: number  // 型は number と言っているが...
) {
  // ...攻撃者は { amount: "delete * from accounts" } を送信可能
  await db.execute(`UPDATE accounts SET balance = balance - ${amount}`);
}

// ✅ 実行時に検証
import { z } from "zod";

const TransferSchema = z.object({
  fromAccount: z.string().uuid(),
  toAccount: z.string().uuid(),
  amount: z.number().positive().max(1000000),
});

export async function transferMoney(input: unknown) {
  const { fromAccount, toAccount, amount } = TransferSchema.parse(input);
  // これで安全に使用可能
}
```

## next-safe-action の使用

検証と認証を強制するライブラリ：

```typescript
// lib/safe-action.ts
import { createSafeActionClient } from "next-safe-action";
import { verifySession } from "./dal";

export const actionClient = createSafeActionClient();

export const authActionClient = actionClient.use(async ({ next }) => {
  const session = await verifySession();
  return next({ ctx: { userId: session.userId } });
});

// app/posts/actions.ts
import { authActionClient } from "@/lib/safe-action";
import { z } from "zod";

export const updatePost = authActionClient
  .schema(z.object({
    postId: z.string().uuid(),
    title: z.string().min(1).max(200),
  }))
  .action(async ({ parsedInput, ctx }) => {
    // ctx.userId はミドルウェアで保証
    // parsedInput は検証済み
    const post = await db.posts.findUnique({
      where: { id: parsedInput.postId }
    });

    if (post?.authorId !== ctx.userId) {
      throw new Error("アクセス拒否");
    }

    return db.posts.update({
      where: { id: parsedInput.postId },
      data: { title: parsedInput.title },
    });
  });
```

## Route Handlers（API ルート）

```typescript
// app/api/posts/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { z } from "zod";

const ParamsSchema = z.object({
  id: z.string().uuid(),
});

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1. パラメータを検証（ユーザー入力！）
  const result = ParamsSchema.safeParse(params);
  if (!result.success) {
    return NextResponse.json({ error: "無効な ID" }, { status: 400 });
  }

  // 2. 認証チェック
  let session;
  try {
    session = await verifySession();
  } catch {
    return NextResponse.json({ error: "認証されていません" }, { status: 401 });
  }

  // 3. リソース認可
  const post = await db.posts.findUnique({ where: { id: result.data.id } });
  if (!post || post.authorId !== session.userId) {
    return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  }

  // 4. アクション実行
  await db.posts.delete({ where: { id: result.data.id } });
  return NextResponse.json({ success: true });
}
```

## Server Components: データ取得

```typescript
// app/posts/[id]/page.tsx
import { getPost } from "@/lib/dal";
import { notFound } from "next/navigation";

// params はユーザー入力 - 検証すること！
export default async function PostPage({
  params
}: {
  params: { id: string }
}) {
  // DAL が認証と認可を処理
  const post = await getPost(params.id);

  if (!post) {
    notFound();  // 見つからないとアクセス拒否で同じレスポンス
  }

  return <PostView post={post} />;
}
```

## ルート保護用ミドルウェア

```typescript
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = ["/", "/login", "/signup", "/api/webhooks"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 公開パスを許可
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // セッション Cookie を確認
  const session = request.cookies.get("session");
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 注意: ミドルウェアは Edge で実行されるため、ここでの完全な DB チェックは高コスト
  // 詳細な認証チェックは Server Actions / Route Handlers で行う
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

## エラー処理: 情報をリークしない

```typescript
// ❌ 情報をリーク
export async function login(email: string, password: string) {
  const user = await db.users.findByEmail(email);
  if (!user) {
    throw new Error("ユーザーが見つかりません");  // メールが存在しないことを漏らす
  }
  if (!await verifyPassword(password, user.passwordHash)) {
    throw new Error("パスワードが違います");  // メールが存在することを漏らす
  }
}

// ✅ 一般的なエラー
export async function login(email: string, password: string) {
  const user = await db.users.findByEmail(email);
  const isValid = user && await verifyPassword(password, user.passwordHash);

  if (!isValid) {
    throw new Error("認証情報が無効です");  // どちらの場合も同じメッセージ
  }
}
```

## CSRF 保護

Server Actions には以下による組み込みの CSRF 保護があります：
- POST のみのリクエスト
- Origin ヘッダーの検証
- SameSite Cookie

Route Handlers では必要に応じて手動で検証：

```typescript
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (origin && !origin.endsWith(host!)) {
    return new Response("CSRF を検出しました", { status: 403 });
  }

  // ... リクエストを処理
}
```
