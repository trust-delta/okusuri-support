# Supabase セキュリティパターン

## RLS: 最初の防衛線

Row Level Security (RLS) ポリシーはクライアント SDK からの**すべてのクエリ**で実行されます。

```sql
-- テーブルで RLS を有効化（必須 - テーブルはデフォルトで公開！）
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- ポリシー: ユーザーは自分の投稿のみ読み取り可能
CREATE POLICY "Users read own posts" ON posts
  FOR SELECT
  USING (auth.uid() = author_id);

-- ポリシー: ユーザーは自分の投稿のみ挿入可能
CREATE POLICY "Users insert own posts" ON posts
  FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- ポリシー: ユーザーは自分の投稿のみ更新可能
CREATE POLICY "Users update own posts" ON posts
  FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- ポリシー: ユーザーは自分の投稿のみ削除可能
CREATE POLICY "Users delete own posts" ON posts
  FOR DELETE
  USING (auth.uid() = author_id);
```

## 重要: サービスロールは RLS をバイパス

```typescript
import { createClient } from "@supabase/supabase-js";

// ❌ 危険: サービスロールはすべての RLS ポリシーをバイパス
const adminClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // フルアクセス！
);

// ✅ 安全: anon キーは RLS を尊重
const publicClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ✅ 安全: ユーザーの JWT は RLS を尊重
const userClient = createClient(url, anonKey, {
  global: {
    headers: { Authorization: `Bearer ${userJwt}` }
  }
});
```

**ルール**: `SUPABASE_SERVICE_ROLE_KEY` をクライアントコードに公開しない。以下でのみ使用：
- サーバーサイド関数（Edge Functions、API ルート）
- RLS をバイパスする必要がある正当な管理者操作
- バックグラウンドジョブ

## 一般的な RLS パターン

### 公開読み取り、認証済み書き込み

```sql
-- 誰でも公開投稿を読み取り可能
CREATE POLICY "Public read published" ON posts
  FOR SELECT
  USING (is_published = true);

-- 認証済みユーザーのみ挿入可能
CREATE POLICY "Auth users insert" ON posts
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
```

### チームベースのアクセス

```sql
-- ユーザーは自分のチームの投稿にアクセス可能
CREATE POLICY "Team members read" ON posts
  FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid()
    )
  );
```

### ロールベースのアクセス

```sql
-- JWT クレームからユーザーロールを確認
CREATE POLICY "Admins full access" ON posts
  FOR ALL
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- または profiles テーブルから確認
CREATE POLICY "Moderators can update" ON posts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'moderator')
    )
  );
```

## Edge Functions: 手動認証

Edge Functions は自動的に RLS を取得しません。JWT を手動で検証：

```typescript
// supabase/functions/delete-account/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // 1. Authorization ヘッダーから JWT を抽出
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "トークンがありません" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const jwt = authHeader.replace("Bearer ", "");

  // 2. ユーザーの JWT でクライアントを作成（RLS を尊重）
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    }
  );

  // 3. 認証済みユーザーを取得
  const { data: { user }, error } = await supabase.auth.getUser(jwt);
  if (error || !user) {
    return new Response(JSON.stringify({ error: "無効なトークン" }), {
      status: 401,
    });
  }

  // 4. このユーザーとして操作を実行しても安全
  // RLS ポリシーが適用される
  const { error: deleteError } = await supabase
    .from("posts")
    .delete()
    .eq("author_id", user.id);

  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), {
      status: 500,
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
  });
});
```

## Edge Functions でサービスロールを使う場合

```typescript
// 正当な使用: RLS をバイパスする必要がある管理者操作
serve(async (req) => {
  // 呼び出し元が管理者であることを確認！
  const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  // ユーザーが管理者か確認
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return forbidden();
  }

  // 管理者操作にサービスロールを使用しても安全
  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // 管理者は正当な管理タスクのために RLS をバイパス可能
  await adminClient.from("audit_logs").insert({ ... });
});
```

## Edge Functions での入力検証

```typescript
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const CreatePostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(50000),
  categoryId: z.string().uuid(),
});

serve(async (req) => {
  // まず認証チェック...

  // 入力検証
  const body = await req.json();
  const result = CreatePostSchema.safeParse(body);

  if (!result.success) {
    return new Response(JSON.stringify({
      error: "検証失敗",
      issues: result.error.issues
    }), { status: 400 });
  }

  // result.data を安全に使用可能
});
```

## 複雑なロジック用データベース関数

複雑な認可をデータベース関数に移動：

```sql
-- 所有権を安全に移転する関数
CREATE OR REPLACE FUNCTION transfer_post_ownership(
  p_post_id UUID,
  p_new_owner_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER  -- 関数オーナーの権限で実行
SET search_path = public
AS $$
DECLARE
  v_current_owner UUID;
BEGIN
  -- 現在のオーナーを取得
  SELECT author_id INTO v_current_owner
  FROM posts WHERE id = p_post_id;

  -- 呼び出し元が現在のオーナーか確認
  IF v_current_owner != auth.uid() THEN
    RAISE EXCEPTION '権限がありません';
  END IF;

  -- 新しいオーナーが存在するか確認
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_new_owner_id) THEN
    RAISE EXCEPTION '新しいオーナーが見つかりません';
  END IF;

  -- 移転を実行
  UPDATE posts SET author_id = p_new_owner_id WHERE id = p_post_id;

  RETURN TRUE;
END;
$$;

-- 認証済みユーザーに実行権限を付与
GRANT EXECUTE ON FUNCTION transfer_post_ownership TO authenticated;
```

## よくある間違い

### RLS の有効化を忘れる

```sql
-- ❌ テーブルはデフォルトで公開！
CREATE TABLE secrets (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  secret_data TEXT
);

-- ✅ 常に RLS を有効化
CREATE TABLE secrets (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  secret_data TEXT
);
ALTER TABLE secrets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "..." ON secrets ...;
```

### 過度に許可的なポリシー

```sql
-- ❌ 誰でも何でも読める！
CREATE POLICY "read_all" ON posts FOR SELECT USING (true);

-- ✅ ユーザーが見るべきものに限定
CREATE POLICY "read_own_or_public" ON posts
  FOR SELECT
  USING (auth.uid() = author_id OR is_public = true);
```

### null の auth.uid() を処理しない

```sql
-- ❌ 未認証時にオープンフェイル
CREATE POLICY "users_own_data" ON profiles
  FOR SELECT USING (id = auth.uid());
-- auth.uid() は匿名の場合 NULL を返す → NULL = anything は FALSE → OK

-- ただし OR 条件に注意：
CREATE POLICY "bad_policy" ON posts
  FOR SELECT USING (author_id = auth.uid() OR is_public = true);
-- 匿名ユーザーがすべての公開投稿を取得（意図的かもしれないし、そうでないかも）

-- ✅ 匿名アクセスについて明示的に
CREATE POLICY "public_posts" ON posts
  FOR SELECT USING (is_public = true);

CREATE POLICY "own_posts" ON posts
  FOR SELECT USING (auth.uid() IS NOT NULL AND author_id = auth.uid());
```

## RLS ポリシーのテスト

```sql
-- 特定のユーザーとしてテスト
SET request.jwt.claims = '{"sub": "user-uuid-here"}';

-- または Supabase のテストヘルパーを使用
SELECT set_config('request.jwt.claims',
  json_build_object('sub', 'user-uuid')::text, true);

-- クエリを実行して結果を確認
SELECT * FROM posts;  -- 認可された行のみ表示されるはず
```
