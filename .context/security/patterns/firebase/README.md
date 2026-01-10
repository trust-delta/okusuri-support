# Firebase セキュリティパターン

## Security Rules: クライアントアクセス制御

Security Rules は **直接クライアントアクセス**から Firestore、Realtime Database、Cloud Storage を保護します。

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ユーザープロファイル: 自分のみ読み書き可能
    match /users/{userId} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId;
    }

    // 投稿: 誰でも読み取り、オーナーのみ書き込み
    match /posts/{postId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null
                            && request.auth.uid == resource.data.authorId;
    }
  }
}
```

## Admin SDK はすべてのルールをバイパス

```typescript
// ❌ Admin SDK はフルアクセス - ルールは適用されない
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const admin = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(admin);

// ルールが "allow: false" でも動作する
await db.collection("secrets").doc("admin-only").get();
```

**ルール**: Admin SDK は以下でのみ実行すべき：
- Cloud Functions
- セキュアなサーバー環境
- クライアントサイドコードでは絶対に使わない

## Cloud Functions: 2つのタイプ

### Callable Functions（推奨）

Firebase SDK が自動的に認証を処理：

```typescript
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";

export const deletePost = onCall(async (request) => {
  // request.auth は Firebase が自動的に検証
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "ログインが必要です");
  }

  const { postId } = request.data;
  if (typeof postId !== "string") {
    throw new HttpsError("invalid-argument", "postId は文字列である必要があります");
  }

  const db = getFirestore();
  const postRef = db.collection("posts").doc(postId);
  const post = await postRef.get();

  if (!post.exists) {
    throw new HttpsError("not-found", "投稿が見つかりません");
  }

  // 認可チェック
  if (post.data()?.authorId !== request.auth.uid) {
    throw new HttpsError("permission-denied", "あなたの投稿ではありません");
  }

  await postRef.delete();
  return { success: true };
});
```

クライアント呼び出し：

```typescript
import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions();
const deletePost = httpsCallable(functions, "deletePost");

// Firebase SDK が自動的に認証トークンを送信
const result = await deletePost({ postId: "abc123" });
```

### HTTP Functions（手動認証が必要）

```typescript
import { onRequest } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";

export const deletePostHttp = onRequest(async (req, res) => {
  // CORS 処理
  res.set("Access-Control-Allow-Origin", "https://yourdomain.com");
  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.status(204).send("");
    return;
  }

  // 手動認証検証
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "トークンがありません" });
    return;
  }

  const idToken = authHeader.split("Bearer ")[1];
  let decodedToken;
  try {
    decodedToken = await getAuth().verifyIdToken(idToken);
  } catch (error) {
    res.status(401).json({ error: "無効なトークン" });
    return;
  }

  const userId = decodedToken.uid;

  // 認可チェックを続行...
  const { postId } = req.body;
  // ... callable function と同じ
});
```

**Callable Functions を優先** - 認証を自動処理し、より良いエラー処理を提供します。

## Security Rules パターン

### データ構造の検証

```javascript
match /posts/{postId} {
  allow create: if request.auth != null
    // 必須フィールドの存在を検証
    && request.resource.data.keys().hasAll(['title', 'content', 'authorId'])
    // authorId が認証ユーザーと一致することを検証
    && request.resource.data.authorId == request.auth.uid
    // フィールド型を検証
    && request.resource.data.title is string
    && request.resource.data.title.size() <= 200
    && request.resource.data.content is string
    && request.resource.data.content.size() <= 50000;

  allow update: if request.auth != null
    && request.auth.uid == resource.data.authorId
    // authorId の変更を防止
    && request.resource.data.authorId == resource.data.authorId;
}
```

### ロール用カスタムクレーム

Cloud Function でカスタムクレームを設定：

```typescript
import { getAuth } from "firebase-admin/auth";

export const setAdminRole = onCall(async (request) => {
  // 既存の管理者のみが新しい管理者を作成可能
  if (!request.auth?.token.admin) {
    throw new HttpsError("permission-denied", "管理者である必要があります");
  }

  const { userId } = request.data;
  await getAuth().setCustomUserClaims(userId, { admin: true });
  return { success: true };
});
```

Security Rules で使用：

```javascript
match /admin/{document=**} {
  allow read, write: if request.auth.token.admin == true;
}
```

### クロスドキュメント検証

```javascript
match /posts/{postId} {
  allow create: if request.auth != null
    // 参照されたカテゴリが存在することを確認
    && exists(/databases/$(database)/documents/categories/$(request.resource.data.categoryId))
    // ユーザーがチームのメンバーであることを確認
    && exists(/databases/$(database)/documents/teams/$(request.resource.data.teamId)/members/$(request.auth.uid));
}
```

**注意**: `get()` と `exists()` 呼び出しは課金対象で、制限があります（単一ドキュメントリクエストで10、バッチで20）。

### ヘルパー関数

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ヘルパー: ユーザーは認証されているか？
    function isAuthenticated() {
      return request.auth != null;
    }

    // ヘルパー: ユーザーはオーナーか？
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // ヘルパー: ユーザーは管理者か？
    function isAdmin() {
      return isAuthenticated() && request.auth.token.admin == true;
    }

    // ヘルパー: ユーザーはチームメンバーか？
    function isTeamMember(teamId) {
      return isAuthenticated()
        && exists(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid));
    }

    match /posts/{postId} {
      allow read: if true;
      allow create: if isAuthenticated();
      allow update, delete: if isOwner(resource.data.authorId) || isAdmin();
    }

    match /teams/{teamId}/documents/{docId} {
      allow read, write: if isTeamMember(teamId);
    }
  }
}
```

## Cloud Functions セキュリティパターン

### レート制限

```typescript
import { getFirestore, FieldValue } from "firebase-admin/firestore";

async function checkRateLimit(
  userId: string,
  action: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  const db = getFirestore();
  const now = Date.now();
  const windowStart = now - windowMs;

  const ref = db.collection("rateLimits").doc(`${userId}_${action}`);

  return db.runTransaction(async (transaction) => {
    const doc = await transaction.get(ref);
    const data = doc.data();

    // 古いエントリをクリーンアップして最近のものをカウント
    const recentAttempts = (data?.attempts || [])
      .filter((t: number) => t > windowStart);

    if (recentAttempts.length >= limit) {
      return false;  // レート制限
    }

    // 新しい試行を追加
    transaction.set(ref, {
      attempts: [...recentAttempts, now],
      updatedAt: FieldValue.serverTimestamp(),
    });

    return true;  // 許可
  });
}

export const sendMessage = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "");

  const allowed = await checkRateLimit(request.auth.uid, "sendMessage", 10, 60000);
  if (!allowed) {
    throw new HttpsError("resource-exhausted", "メッセージが多すぎます");
  }

  // ... メッセージを送信
});
```

### 入力検証

```typescript
import { z } from "zod";

const CreatePostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(50000),
  categoryId: z.string(),
});

export const createPost = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "ログインが必要です");
  }

  // 入力検証
  const result = CreatePostSchema.safeParse(request.data);
  if (!result.success) {
    throw new HttpsError("invalid-argument", "無効な入力", result.error);
  }

  const { title, content, categoryId } = result.data;

  // カテゴリの存在を確認
  const db = getFirestore();
  const category = await db.collection("categories").doc(categoryId).get();
  if (!category.exists) {
    throw new HttpsError("not-found", "カテゴリが見つかりません");
  }

  // 投稿を作成
  const postRef = await db.collection("posts").add({
    title,
    content,
    categoryId,
    authorId: request.auth.uid,
    createdAt: FieldValue.serverTimestamp(),
  });

  return { postId: postRef.id };
});
```

## よくある間違い

### クライアント提供のユーザー ID を信頼

```javascript
// ❌ 間違い: クライアントは任意の authorId を送信可能
match /posts/{postId} {
  allow create: if request.resource.data.authorId != null;
}

// ✅ 正解: authorId を認証ユーザーと一致させる
match /posts/{postId} {
  allow create: if request.auth != null
    && request.resource.data.authorId == request.auth.uid;
}
```

### 読み取りルールがリスト化を許可することを忘れる

```javascript
// ❌ これはすべての投稿のリスト化を許可
match /posts/{postId} {
  allow read: if request.auth != null;
}

// ログインしている誰でも: db.collection("posts").get() が可能

// ✅ リスト化を制限したい場合は、list と get を分ける
match /posts/{postId} {
  allow get: if request.auth != null;  // 単一ドキュメント
  allow list: if request.auth != null
    && request.auth.uid == resource.data.authorId;  // 自分の投稿のみ
}
```

### ルールをテストしない

Firebase Emulator を使用してテスト：

```typescript
// test/rules.test.ts
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";

const testEnv = await initializeTestEnvironment({
  projectId: "demo-test",
  firestore: { rules: fs.readFileSync("firestore.rules", "utf8") },
});

test("ユーザーは自分のプロファイルを読み取り可能", async () => {
  const userContext = testEnv.authenticatedContext("user123");
  const db = userContext.firestore();

  await assertSucceeds(
    db.collection("users").doc("user123").get()
  );
});

test("ユーザーは他のプロファイルを読み取り不可", async () => {
  const userContext = testEnv.authenticatedContext("user123");
  const db = userContext.firestore();

  await assertFails(
    db.collection("users").doc("other-user").get()
  );
});
```
