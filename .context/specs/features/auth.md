# 認証機能仕様

**最終更新**: 2025年10月16日

## 概要

Convex Authを使用したセキュアなユーザー認証システム。パスワード認証とOTPメール認証に対応。

---

## 認証方式

### 1. パスワード認証
- メールアドレス + パスワード
- bcryptによるハッシング
- Convex Auth標準実装

### 2. OTPメール認証
- メールアドレスにワンタイムパスワード送信
- Resend APIによるメール送信
- 有効期限: 10分

### 3. OAuth（準備済み）
- Google, GitHub等
- 将来の拡張に備えた設定

---

## データモデル

### users テーブル

```typescript
{
  _id: Id<"users">,
  name?: string,
  image?: string,
  email?: string,
  emailVerificationTime?: number,
  phone?: string,
  phoneVerificationTime?: number,
  isAnonymous?: boolean,
  displayName?: string,           // ユーザー表示名（全グループ共通）
  customImageStorageId?: Id<"_storage">,  // カスタム画像
}
```

**インデックス**:
- `email`: メールアドレス検索用

---

## 認証フロー

### サインアップ（パスワード）

```
1. ユーザーがメールアドレス + パスワード入力
2. Convex Auth: パスワードハッシュ化
3. usersテーブルに新規ユーザー作成
4. JWTトークン発行
5. クライアントにトークン返却
```

### サインアップ（OTP）

```
1. ユーザーがメールアドレス入力
2. Convex Auth: OTPコード生成（6桁数字）
3. Resend API: OTPメール送信
4. ユーザーがOTPコード入力
5. Convex Auth: OTPコード検証
6. usersテーブルに新規ユーザー作成（初回）
7. JWTトークン発行
```

### サインイン（パスワード）

```
1. ユーザーがメールアドレス + パスワード入力
2. Convex Auth: パスワード検証
3. JWTトークン発行
```

### サインイン（OTP）

```
1. ユーザーがメールアドレス入力
2. Convex Auth: OTPコード生成
3. Resend API: OTPメール送信
4. ユーザーがOTPコード入力
5. Convex Auth: OTPコード検証
6. JWTトークン発行
```

### サインアウト

```
1. クライアント: サインアウトリクエスト
2. Convex Auth: セッション無効化
3. クライアント: ローカルトークン削除
```

---

## セキュリティ

### パスワード
- **ハッシング**: bcrypt
- **要件**: 最小8文字（フロントエンドバリデーション）

### JWT
- **署名**: HS256
- **有効期限**: 7日間（Convex Authデフォルト）
- **保存**: httpOnlyクッキー

### OTP
- **形式**: 6桁数字
- **有効期限**: 10分
- **送信**: Resend API（暗号化通信）

---

## API

### Mutations

#### signIn
```typescript
// パスワード認証
await signIn("password", { email, password })

// OTP認証（Step 1: コード送信）
await signIn("otp", { email })

// OTP認証（Step 2: コード検証）
await signIn("otp", { email, code })
```

#### signOut
```typescript
await signOut()
```

### Queries

#### getUserIdentity
```typescript
const identity = await ctx.auth.getUserIdentity()
// Returns: { subject: string, email?: string, ... } | null
```

---

## UI実装

### ログインページ (`/login`)
- パスワード認証フォーム
- OTP認証フォーム
- タブ切り替え

### フロントエンドコンポーネント
- `src/features/auth/components/SignInForm.tsx`
- `src/features/auth/components/OtpForm.tsx`

---

## エラーハンドリング

### エラーケース

| エラー | 原因 | 対応 |
|--------|------|------|
| Invalid credentials | パスワード不一致 | "メールアドレスまたはパスワードが正しくありません" |
| Invalid OTP | OTPコード不一致 | "認証コードが正しくありません" |
| OTP expired | OTP有効期限切れ | "認証コードの有効期限が切れました" |
| Email not verified | メール未認証 | "メールアドレスを確認してください" |

---

## テスト

### ユニットテスト
- パスワードバリデーション
- OTPコード生成

### E2Eテスト
- パスワード認証フロー
- OTP認証フロー
- サインアウト

---

## 制限事項

- **OAuth**: 準備済みだが未実装
- **パスワードリセット**: 未実装（将来対応予定）
- **二段階認証**: 未実装

---

## 関連ドキュメント

- [プロジェクト概要](../../project.md)
- [アーキテクチャ](../../architecture.md)
- [グループ管理](group.md)
