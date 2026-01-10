# セキュリティコードレビューチェックリスト

フロントエンドエンジニア（または誰でも）が書いたバックエンドコードをレビューする際に使用します。

## クイックチェック（すべての関数）

### 認証

- [ ] 関数はユーザーが認証されているかチェックしているか？
- [ ] ユーザー ID はどこから来ているか？（セッション/JWT、関数引数ではなく）
- [ ] `getUser()` が null を返した場合どうなるか？

```typescript
// ❌ 認証チェック忘れ
export async function getSecretData() {
  return db.secrets.findMany();  // 誰でも呼び出せる！
}

// ❌ 引数からユーザー ID
export async function getUserData(userId: string) {
  return db.users.findUnique({ where: { id: userId } });
}

// ✅ 認証チェック、セッションからユーザー
export async function getUserData() {
  const session = await requireAuth();
  return db.users.findUnique({ where: { id: session.userId } });
}
```

### 認可

- [ ] このユーザーがこの特定のリソースにアクセスできるかチェックがあるか？
- [ ] 適用すべきロールベースの制限があるか？
- [ ] 引数の ID で参照されるリソースはどうか？

```typescript
// ❌ リソース認可が欠落
export async function deletePost(postId: string) {
  const user = await requireAuth();
  await db.posts.delete({ where: { id: postId } });  // どの投稿でも！
}

// ✅ リソース所有権を確認
export async function deletePost(postId: string) {
  const user = await requireAuth();
  const post = await db.posts.findUnique({ where: { id: postId } });
  if (post?.authorId !== user.id) throw new Error("アクセス拒否");
  await db.posts.delete({ where: { id: postId } });
}
```

### 入力検証

- [ ] すべての入力が実行時に検証されているか（TypeScript だけでなく）？
- [ ] 文字列長、数値範囲に制約があるか？
- [ ] 不正な入力が下流で問題を起こす可能性はないか？

```typescript
// ❌ TypeScript の型は実行時に強制されない
export async function search(query: string, limit: number) {
  return db.posts.findMany({ where: { title: { contains: query } }, take: limit });
  // limit が 999999、query が空の可能性
}

// ✅ 実行時検証
import { z } from "zod";
const schema = z.object({
  query: z.string().min(1).max(100),
  limit: z.number().int().min(1).max(50),
});

export async function search(input: unknown) {
  const { query, limit } = schema.parse(input);
  return db.posts.findMany({ where: { title: { contains: query } }, take: limit });
}
```

## プラットフォーム別チェック

### Convex

- [ ] これは `query`/`mutation`（公開）か `internal*`（サーバー専用）か？
- [ ] 公開ではなく `internal*` であるべきか？
- [ ] データベース操作前に `ctx.auth` がチェックされているか？

### Next.js

- [ ] Server Action は `"use server"` を使用しているか？（公開エンドポイント）
- [ ] 入力は Zod などで検証されているか？
- [ ] Data Access Layer パターンを使用しているか？
- [ ] `[slug]` ルートの params は検証されているか？

### Supabase

- [ ] テーブルで RLS が有効か？
- [ ] RLS ポリシーはすべての操作（SELECT、INSERT、UPDATE、DELETE）をカバーしているか？
- [ ] サービスロールキーを使用している場合、正当化されているか？
- [ ] Edge Functions で JWT は手動検証されているか？

### Firebase

- [ ] このコレクションに Security Rules が設置されているか？
- [ ] ルールは `request.auth.uid` をチェックしているか？
- [ ] Cloud Functions では `onCall`（自動認証）か `onRequest`（手動）か？
- [ ] Admin SDK を使用している場合、呼び出し元は事前に適切に認可されているか？

## 情報漏洩

- [ ] エラーメッセージは機密情報を明かしていないか？
- [ ] 「見つからない」と「アクセス拒否」のレスポンスに違いがあるか？（同じであるべき）
- [ ] 内部 ID やデータベース構造が不必要に公開されていないか？
- [ ] タイミングの違いが情報を漏らす可能性はないか？（シークレットには定数時間比較）

```typescript
// ❌ 情報を漏らす
if (!user) throw new Error("ユーザーが見つかりません");
if (!verifyPassword(password, user.hash)) throw new Error("パスワードが違います");

// ✅ 一般的なエラー
const valid = user && await verifyPassword(password, user.hash);
if (!valid) throw new Error("認証情報が無効です");
```

## 注意すべき一般的なパターン

### IDOR（安全でない直接オブジェクト参照）

```typescript
// ユーザー入力から来る ID に注意
function getResource(id: string) // ← id はユーザーが制御
```

認証されたユーザーが `id` にアクセスできることを常に確認。

### マスアサインメント

```typescript
// ❌ ユーザー入力を直接スプレッド
export async function updateUser(data: UserUpdate) {
  const user = await requireAuth();
  await db.users.update({ where: { id: user.id }, data });
  // data に { role: "admin", credits: 99999 } が含まれる可能性
}

// ✅ 明示的なフィールド
export async function updateUser(data: unknown) {
  const user = await requireAuth();
  const { name, bio } = UserUpdateSchema.parse(data);
  await db.users.update({ where: { id: user.id }, data: { name, bio } });
}
```

### 未検証のリダイレクト

```typescript
// ❌ オープンリダイレクト脆弱性
redirect(req.query.returnTo);

// ✅ 許可リストで検証
const allowed = ["/dashboard", "/profile", "/settings"];
const returnTo = allowed.includes(req.query.returnTo)
  ? req.query.returnTo
  : "/dashboard";
redirect(returnTo);
```

### サービスキーの露出

```bash
# 環境変数をチェック
grep -r "SERVICE_ROLE" --include="*.ts" --include="*.tsx"
grep -r "FIREBASE_ADMIN" --include="*.ts" --include="*.tsx"

# これらはクライアントアクセス可能なコードに絶対に現れてはならない
```

## 作者への質問

1. 「未認証ユーザーがこれを呼び出したらどうなる？」
2. 「ユーザーが他人の ID を渡したらどうなる？」
3. 「なぜこれは internal ではなく公開関数なのか？」
4. 「悪意のあるユーザーがこのエンドポイントでできる最悪のことは？」
5. 「これのセキュリティをどのようにテストした？」

## 危険信号

| パターン | 懸念 |
|---------|---------|
| 関数の最初に `await requireAuth()` がない | 認証欠落 |
| 関数引数としてのユーザー ID | IDOR 脆弱性 |
| データベースへの `...data` スプレッド | マスアサインメント |
| すべての失敗で同じエラーメッセージ | 良い！ |
| 見つからないとアクセス拒否で異なるエラー | 情報漏洩 |
| クライアントコードの `SERVICE_ROLE_KEY` | 致命的な露出 |
| 複雑な条件付き認証ロジック | 間違いやすい |
| `// TODO: 認証チェックを追加` | 致命的な機能欠落 |
