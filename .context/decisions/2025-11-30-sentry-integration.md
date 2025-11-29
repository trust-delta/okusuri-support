# 決定記録: Sentry エラー監視の導入

**日付**: 2025年11月30日
**ステータス**: 承認済み
**決定者**: 開発者

---

## 背景

本番環境でのエラー監視・追跡機能がなく、以下の問題が発生していた：

### 現状の問題点

#### 1. エラーの可視性が低い
- 本番環境でエラーが発生しても検知できない
- ユーザーからの報告でしかエラーを把握できない
- エラーの発生頻度や傾向を分析できない

#### 2. デバッグが困難
- エラー発生時のコンテキスト（スタックトレース、環境情報）がない
- 再現が困難なエラーの調査に時間がかかる
- クライアントサイドのエラーは特に追跡が難しい

#### 3. 医療アプリとしての信頼性
- 服薬管理という重要な機能でエラーが放置されるリスク
- ユーザーの信頼性に影響
- 早期発見・早期対応が必要

### なぜ今決定する必要があるのか

- 本番環境へのデプロイ準備として、監視基盤が必要
- コードレビューで「監視なし」が指摘された
- 個人開発でも本番品質を担保したい

---

## 決定

### Sentry を導入し、クライアント・サーバー・エッジ全てでエラー監視を有効にする

#### 導入内容

1. **@sentry/nextjs パッケージの導入**
   - Next.js App Router に最適化
   - クライアント・サーバー・エッジを統合的にサポート

2. **設定ファイル**
   - `sentry.client.config.ts`: クライアントサイド設定
   - `sentry.server.config.ts`: サーバーサイド設定
   - `sentry.edge.config.ts`: Edge Runtime設定
   - `instrumentation.ts`: Next.js instrumentation

3. **プライバシー設定（医療アプリ向け）**
   - `sendDefaultPii: false`: 個人識別情報を送信しない
   - `maskAllText: true`: セッションリプレイで全テキストをマスク
   - `blockAllMedia: true`: メディアをブロック

4. **パフォーマンス最適化**
   - `tracesSampleRate: 0.1`: 10%サンプリング（コスト削減）
   - `replaysSessionSampleRate: 0.1`: セッションリプレイ10%
   - `replaysOnErrorSampleRate: 1.0`: エラー時は100%記録

---

## 理由

### 1. Next.js との統合性
- `@sentry/nextjs` は Next.js App Router に最適化されている
- 自動的なソースマップアップロード
- Server Components、Server Actions のエラーキャプチャ
- Edge Runtime のサポート

### 2. 無料プランで十分な機能
- 個人開発プロジェクトに適した無料枠
- 基本的なエラー追跡、パフォーマンスモニタリング
- セッションリプレイ機能

### 3. 医療アプリ向けのプライバシー設定
- PII（個人識別情報）の送信を無効化可能
- テキストマスキング、メディアブロック機能
- 日本国内のデータ保護要件に対応可能

### 4. 開発者体験
- GitHub との統合（Issue 自動作成）
- Slack 通知
- 詳細なスタックトレースとコンテキスト

---

## 利点

✅ **本番エラーの可視化**: エラー発生を即座に検知
✅ **詳細なコンテキスト**: スタックトレース、ブラウザ情報、ユーザーアクション
✅ **セッションリプレイ**: エラー発生時のユーザー操作を再現
✅ **パフォーマンスモニタリング**: 応答速度、Core Web Vitals の追跡
✅ **プライバシー保護**: 医療情報のマスキング、PII 送信無効化
✅ **無料プラン**: 個人開発に十分な機能を無料で利用可能
✅ **Next.js 統合**: App Router、Server Components に最適化

---

## 欠点と対応策

❌ **外部サービス依存**: Sentry のサービス停止時にエラー追跡不可
  → **対応**: ログ出力も併用、重大エラーはコンソールにも出力

❌ **データ送信によるパフォーマンス影響**:
  → **対応**: サンプリングレート 10% で影響を最小化

❌ **プライバシーリスク**: 誤って機密情報を送信する可能性
  → **対応**:
  - `sendDefaultPii: false` を設定
  - `maskAllText: true` でテキストマスク
  - `blockAllMedia: true` でメディアブロック
  - コードレビューで確認

❌ **コスト**: 無料枠を超えた場合のコスト発生
  → **対応**: サンプリングレートで制御、アラート設定

---

## 代替案

### 代替案1: ログベースの監視（CloudWatch等）

**メリット**:
- AWS 統合（Vercel との相性は不明）
- ログの長期保存
- カスタムメトリクス

**デメリット**:
- セットアップが複雑
- リアルタイム性が低い
- セッションリプレイ機能なし

**却下理由**:
- 個人開発には過剰な構成
- Vercel との統合が不明確
- Sentry の方がシンプルで高機能

### 代替案2: Vercel Analytics

**メリット**:
- Vercel との統合が簡単
- Next.js に最適化
- パフォーマンスモニタリング

**デメリット**:
- エラー追跡機能が限定的
- セッションリプレイなし
- 詳細なスタックトレースなし

**却下理由**:
- エラー追跡がメイン目的のため、機能が不足
- Sentry と併用は可能（将来検討）

### 代替案3: 自前のエラーログ収集

**メリット**:
- 完全なコントロール
- 外部依存なし
- コストなし

**デメリット**:
- 開発・運用コストが高い
- 機能が限定的
- セッションリプレイなど高度な機能を実装困難

**却下理由**:
- 個人開発でメンテナンスが困難
- Sentry の無料プランで十分

---

## 設定詳細

### 環境変数

```env
# .env.local / .env.production
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_ORG=your-org
SENTRY_PROJECT=okusuri-support
SENTRY_AUTH_TOKEN=sntrys_xxx
```

### クライアント設定

```typescript
// sentry.client.config.ts
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});
```

### サーバー/エッジ設定

```typescript
// sentry.server.config.ts / sentry.edge.config.ts
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  enableLogs: true,
  sendDefaultPii: false,
});
```

---

## 影響範囲

### 新規ファイル
- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- `instrumentation.ts`
- `instrumentation-client.ts`
- `app/global-error.tsx`

### 変更ファイル
- `next.config.ts`: `withSentryConfig` ラッパー追加
- `.env.example`: Sentry 環境変数追加
- `.gitignore`: `.env.sentry-build-plugin` 追加

---

## リスクと軽減策

| リスク | 発生確率 | 影響度 | 軽減策 |
|--------|----------|--------|--------|
| 機密情報の誤送信 | 低 | 高 | PII無効化、テキストマスク、コードレビュー |
| サービス停止 | 低 | 中 | コンソールログ併用 |
| 無料枠超過 | 低 | 低 | サンプリングレート調整、アラート設定 |
| パフォーマンス影響 | 低 | 低 | 10%サンプリングで最小化 |

---

## 成功基準

- [x] Sentry ダッシュボードでエラーが表示される
- [x] クライアント・サーバー両方のエラーがキャプチャされる
- [x] セッションリプレイが機能する
- [x] 医療情報がマスクされている
- [x] パフォーマンスへの影響が最小限

---

## 関連ドキュメント

- [プロジェクト概要](../project.md)
- [アーキテクチャ](../architecture.md)
- [エラーハンドリング](../error-handling.md)

---

## 承認

| 役割 | 名前 | 日付 |
|------|------|------|
| 提案者 | AI | 2025-11-30 |
| レビュー | 開発者 | 2025-11-30 |
| 承認者 | 開発者 | 2025-11-30 |

---

## 実装状況

1. ✅ @sentry/nextjs パッケージ導入
2. ✅ 設定ファイル作成（client/server/edge）
3. ✅ プライバシー設定適用
4. ✅ next.config.ts 統合
5. ✅ global-error.tsx 作成
6. ✅ 環境変数設定

---

## 更新履歴

- 2025-11-30: 初版作成（コードレビュー後の改善として導入）
