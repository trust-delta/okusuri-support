# セキュリティチェック

セキュリティリスクをチェックします。

## チェック項目

### 1. 機密情報のハードコード

#### チェック内容
- APIキーのハードコード
- パスワードのハードコード
- シークレットのハードコード
- 環境変数の適切な使用

#### 検出パターン
```typescript
// ❌ Bad
const API_KEY = "sk-1234567890abcdef";
const password = "admin123";

// ✅ Good
const API_KEY = process.env.API_KEY;
const password = await getSecretFromVault("db-password");
```

#### 検索コマンド
```bash
Grep: pattern="(api_key|apikey|secret|password|token)\s*[:=]\s*[\"']" -i
```

---

### 2. 入力バリデーション

#### チェック内容
- ユーザー入力のサニタイズ
- 型の検証
- 範囲の検証
- 必須フィールドの検証

#### 検出パターン
```typescript
// ❌ Bad
const userId = req.params.id;
await db.query(`SELECT * FROM users WHERE id = ${userId}`);

// ✅ Good
const userId = z.string().uuid().parse(req.params.id);
await db.query("SELECT * FROM users WHERE id = ?", [userId]);
```

---

### 3. 認証・認可

#### チェック内容
- 認証チェックの存在
- 認可チェックの存在
- ロールベースアクセス制御
- リソースの所有権確認

#### 検出パターン
```typescript
// ❌ Bad
export const deletePrescription = mutation({
  handler: async (ctx, args) => {
    await ctx.db.delete(args.prescriptionId);
  },
});

// ✅ Good
export const deletePrescription = mutation({
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const prescription = await ctx.db.get(args.prescriptionId);
    await requireOwnership(prescription, userId);
    await ctx.db.delete(args.prescriptionId);
  },
});
```

---

### 4. XSS対策

#### チェック内容
- dangerouslySetInnerHTMLの使用
- ユーザー入力の直接レンダリング
- URLの検証

#### 検出パターン
```typescript
// ❌ Bad
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ Good
import DOMPurify from "dompurify";
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />
```

---

### 5. 依存関係の脆弱性

#### チェック内容
- 既知の脆弱性を持つパッケージ
- 古いバージョンのパッケージ

#### 検査コマンド
```bash
npm audit
pnpm audit
```

---

## OWASP Top 10 チェックリスト

| # | リスク | チェック |
|---|--------|----------|
| 1 | インジェクション | 入力のサニタイズ |
| 2 | 認証の不備 | 認証フローの確認 |
| 3 | 機密データの露出 | 暗号化、マスキング |
| 4 | XXE | XMLパーサーの設定 |
| 5 | アクセス制御の不備 | 認可チェック |
| 6 | セキュリティ設定ミス | ヘッダー、CORS |
| 7 | XSS | 出力のエスケープ |
| 8 | 安全でないデシリアライゼーション | 入力の検証 |
| 9 | 既知の脆弱性 | 依存関係の更新 |
| 10 | 不十分なログ | 監査ログ |

---

## 実行フロー

### 1. 変更ファイルの取得
```bash
git diff main...HEAD --name-only
```

### 2. セキュリティパターンの検索
各チェック項目のパターンを検索

### 3. 結果レポート
```markdown
### セキュリティチェック結果

#### 🔴 Critical
- src/api/auth.ts:15 - ハードコードされたシークレット

#### 🟡 Warning
- src/features/user/mutations.ts:42 - 認可チェックが不足

#### 🔵 Info
- package.json - `npm audit` の実行を推奨
```
