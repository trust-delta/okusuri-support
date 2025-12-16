---
name: backend-boundary-security
description: |
  フロントエンドエンジニアがバックエンドコードを書く際のセキュリティガイダンス。以下を扱う場合に使用：
  (1) Convex の query/mutation/action
  (2) Next.js Server Actions、Route Handlers、Server Components
  (3) Supabase Edge Functions、RLS ポリシー
  (4) Firebase Security Rules、Cloud Functions
  信頼境界、認可パターン、入力検証、よくある間違いをカバー。
  トリガー：「これは安全？」「認可チェック」「誰がこれを呼べる？」フロントエンドエンジニアが書いたバックエンドコードのレビュー時。
---

# バックエンド境界セキュリティ

フロントエンドエンジニアがサーバーサイドコードを書く際のセキュリティガイダンス。

## 核心概念: 信頼境界

**信頼境界**は、自分がコントロールするコードと、信頼できない入力を分離します。

```
┌─────────────────────────────────────────────────────────┐
│  信頼できない（攻撃者はここのすべてをコントロール可能）  │
│  - すべての関数引数                                      │
│  - すべての HTTP ヘッダー、Cookie、クエリパラメータ       │
│  - すべてのクライアントサイドの状態                       │
│  - UI 制限（非表示ボタン、無効化されたフィールド）        │
└─────────────────────────────────────────────────────────┘
                          │
                    信頼境界
                          │
┌─────────────────────────────────────────────────────────┐
│  信頼できる（サーバーサイドコード）                       │
│  - 検証済みパラメータを使ったデータベースクエリ           │
│  - セキュアな Cookie からの認証済みセッションデータ       │
│  - サーバー環境変数                                       │
└─────────────────────────────────────────────────────────┘
```

**考え方の転換**: フロントエンドでは、何が関数を呼ぶかをコントロールできます。バックエンドでは、**誰でも公開された関数を任意の引数で呼び出せます**。

## 必須チェックリスト

すべてのバックエンド関数は以下の質問に答える必要があります：

1. **認証**: 誰がこのリクエストを行っているか？（`null` = 匿名）
2. **認可**: この特定のアクションを行う権限があるか？
3. **入力検証**: すべての引数が安全で期待通りか？
4. **リソース認可**: この特定のリソースにアクセス/変更できるか？

```typescript
// パターン: 4つのチェック
async function updatePost(postId: string, content: string) {
  // 1. 認証
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("認証されていません");

  // 2. 入力検証
  const validatedId = z.string().uuid().parse(postId);
  const validatedContent = z.string().min(1).max(10000).parse(content);

  // 3. リソース認可
  const post = await db.posts.get(validatedId);
  if (post.authorId !== user.id) throw new Error("アクセス拒否");

  // 4. アクション実行
  return db.posts.update(validatedId, { content: validatedContent });
}
```

## プラットフォーム別パターン

### Convex

すべての `query` と `mutation` 関数は**公開 HTTP エンドポイント**です。

```typescript
// ❌ 間違い: 認証チェックなし
export const deletePost = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    await ctx.db.delete(postId);  // 誰でも任意の投稿を削除できる！
  },
});

// ✅ 正解: 認証 + リソースチェック
export const deletePost = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("認証されていません");

    const post = await ctx.db.get(postId);
    if (!post || post.authorId !== userId) {
      throw new Error("アクセス拒否");
    }

    await ctx.db.delete(postId);
  },
});
```

クライアントから呼び出されるべきでないサーバー専用関数には `internalMutation`/`internalQuery` を使用。

**参照**: 完全なパターンは `patterns/convex/README.md` を参照。

### Next.js Server Actions

Server Actions は定義場所に関係なく**公開 HTTP エンドポイント**です。

```typescript
// ❌ 間違い: クライアントデータを信頼
"use server";
export async function updateUser(userId: string, data: UserData) {
  // userId はクライアントから来る - 攻撃者は任意の ID を渡せる！
  await db.users.update(userId, data);
}

// ✅ 正解: セッションからユーザーを取得、入力を検証
"use server";
export async function updateUser(data: unknown) {
  const session = await getSession();
  if (!session?.userId) throw new Error("認証されていません");

  const validated = UserUpdateSchema.parse(data);
  await db.users.update(session.userId, validated);
}
```

TypeScript の型は**コンパイル時のみ**。Zod などで常に実行時に検証してください。

**参照**: Data Access Layer パターンは `patterns/nextjs/README.md` を参照。

### Supabase

RLS（Row Level Security）はすべてのクエリで実行されますが、**クライアント SDK 呼び出しに対してのみ**です。

```sql
-- RLS ポリシー: ユーザーは自分のデータのみ読み取り可能
CREATE POLICY "Users read own data" ON profiles
  FOR SELECT USING (auth.uid() = user_id);
```

```typescript
// ❌ 間違い: サービスロールは RLS をバイパス
const supabase = createClient(url, SERVICE_ROLE_KEY);
// これはすべての RLS ポリシーをバイパス！

// ✅ 正解: クライアント操作には anon キー + RLS を使用
const supabase = createClient(url, ANON_KEY);
```

Edge Functions では手動で JWT を検証し、権限をチェックする必要があります。

**参照**: RLS パターンは `patterns/supabase/README.md` を参照。

### Firebase

Security Rules は Firestore/RTDB/Storage を保護。Admin SDK は**すべてのルールをバイパス**。

```javascript
// Security Rules
match /posts/{postId} {
  allow read: if true;
  allow write: if request.auth != null
               && request.auth.uid == resource.data.authorId;
}
```

```typescript
// ❌ Cloud Functions での間違い: 認証検証なし
export const deletePost = functions.https.onRequest(async (req, res) => {
  await admin.firestore().doc(`posts/${req.body.postId}`).delete();
});

// ✅ 正解: ID トークンを検証
export const deletePost = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated");

  const post = await admin.firestore().doc(`posts/${data.postId}`).get();
  if (post.data()?.authorId !== context.auth.uid) {
    throw new functions.https.HttpsError("permission-denied");
  }

  await post.ref.delete();
});
```

`onRequest` より `onCall` を優先 - Firebase SDK がトークン検証を自動で処理します。

**参照**: Security Rules パターンは `patterns/firebase/README.md` を参照。

## よくある間違い

| 間違い | なぜ問題か | 修正方法 |
|---------|---------------|-----|
| 「ボタンを非表示にしたからユーザーはこれができない」 | 攻撃者は UI を使わない | サーバーサイドで権限チェック |
| クライアント引数の `userId` を信頼 | 攻撃者は任意の ID を渡せる | 認証済みセッションからユーザー ID を取得 |
| クライアントでのみ検証 | 攻撃者はクライアントコードをバイパス | 常にサーバーで検証 |
| 「見つからない」と「アクセス拒否」で異なるエラーメッセージ | リソースの存在をリーク | 一般的な「見つからないかアクセス拒否」を返す |
| エラーに機密データをログ出力 | ログやエラートラッカーに残る | ログ出力前にサニタイズ |

## 考え方転換チェックリスト

バックエンド関数を書く前に確認：

- [ ] 「攻撃者がこれを curl で直接呼んだらどうなる？」
- [ ] 「他人のユーザー ID を渡されたらどうなる？」
- [ ] 「TypeScript を通過するが実行時に壊れる不正データを渡されたら？」
- [ ] 「エラーメッセージはどんな情報をリークする？」
- [ ] 「これは1秒間に1000回呼び出される可能性がある？レート制限は必要？」

## 静的解析

解析スクリプトを実行して一般的な問題を検出：

```bash
python scripts/analyze.py ./convex  # または Next.js なら ./app
```

スクリプトは以下をチェック：
- 認証チェックのない公開関数
- データベースクエリでの未検証引数の直接使用
- クライアントアクセス可能なコードでのサービスロールキー
- 入力検証の欠如

## 参考資料

- `concepts/defense-in-depth.md` - 多層防御アプローチ
- `checklist/code-review.md` - PR 用レビューチェックリスト
- `patterns/*/README.md` のプラットフォーム別パターン
