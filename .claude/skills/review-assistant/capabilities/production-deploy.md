# 本番デプロイ前チェック

本番環境へのデプロイ前に確認すべき項目をチェックします。

## チェック項目

### 1. 認証・認可の保護範囲

#### チェック内容
- ミドルウェアで保護すべきルートが網羅されているか
- 認証が必要なページへの直接アクセスが防がれているか

#### 検証方法
```bash
# middleware.ts の保護ルート一覧を確認
Grep: pattern="createRouteMatcher" path="middleware.ts"
```

#### 確認ポイント
- `/dashboard` 配下
- `/settings` 配下
- `/prescriptions` 配下
- その他の認証必要ページ

---

### 2. セキュリティヘッダー

#### チェック内容
- `next.config.ts` でセキュリティヘッダーが設定されているか

#### 必須ヘッダー
| ヘッダー | 推奨値 | 目的 |
|---------|--------|------|
| X-Frame-Options | DENY | クリックジャッキング防止 |
| X-Content-Type-Options | nosniff | MIME スニッフィング防止 |
| Referrer-Policy | strict-origin-when-cross-origin | リファラー情報制御 |
| X-XSS-Protection | 1; mode=block | XSS フィルター有効化 |
| Strict-Transport-Security | max-age=31536000; includeSubDomains | HTTPS 強制 |
| Permissions-Policy | camera=(), microphone=()... | 機能制限 |

#### 検証コマンド
```bash
Grep: pattern="headers.*async" path="next.config.ts"
```

---

### 3. エラー監視

#### チェック内容
- Sentry などのエラー監視サービスが設定されているか
- クライアント・サーバー・エッジで適切に初期化されているか

#### 確認ファイル
- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- `instrumentation.ts`

#### 環境変数
```env
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=
```

---

### 4. 環境変数管理

#### チェック内容
- 機密情報がコードにハードコードされていないか
- `.env.example` が最新か
- 本番環境で必要な環境変数が全て定義されているか

#### 検証コマンド
```bash
# ハードコードされた機密情報の検索
Grep: pattern="(sk-|api_key|secret)" -i
```

---

### 5. テスト・品質

#### チェック内容
- 型チェックがパスするか
- Lint エラーがないか
- テストがパスするか

#### 検証コマンド
```bash
npm run type-check
npm run lint
npm run test
```

---

### 6. 依存関係

#### チェック内容
- npm audit で脆弱性がないか
- 重要なパッケージが最新か

#### 検証コマンド
```bash
pnpm audit
```

---

## チェックリスト

### 必須（デプロイブロッカー）
- [ ] 型チェックがパス
- [ ] Lint エラーなし
- [ ] 認証ミドルウェアの保護範囲が適切
- [ ] 環境変数のハードコードなし

### 推奨
- [ ] セキュリティヘッダー設定済み
- [ ] エラー監視設定済み
- [ ] npm 脆弱性なし（high/critical）
- [ ] テストカバレッジ基準達成

### オプション
- [ ] パフォーマンス最適化
- [ ] ドキュメント更新
- [ ] CHANGELOG 更新

---

## 出力フォーマット

```markdown
## 本番デプロイ前チェック結果

### ステータス: ✅ デプロイ可能 / ⚠️ 要確認 / ❌ ブロッカーあり

### 必須項目
- [x] 型チェック: パス
- [x] Lint: パス
- [ ] 認証保護: 要確認（/api/admin が未保護）

### 推奨項目
- [x] セキュリティヘッダー: 設定済み
- [x] エラー監視: Sentry 設定済み
- [ ] npm 脆弱性: 2件の moderate

### アクション
1. `/api/admin` をミドルウェアで保護
2. `npm audit fix` で脆弱性を修正
```

---

**最終更新**: 2025年11月30日
