# 技術スタック

**最終更新**: 2025年10月16日

## アーキテクチャ概要

フルスタックTypeScript構成。Next.js（フロントエンド）+ Convex（バックエンド）によるリアルタイム同期とサーバーレス構成。

```
┌─────────────┐     ┌─────────────┐
│  Next.js 15 │────▶│ Convex Auth │
└──────┬──────┘     └─────────────┘
       │ WebSocket
       ▼
┌─────────────┐     ┌─────────────┐
│   Convex    │────▶│   Resend    │
│ (Backend)   │     │   (Email)   │
└─────────────┘     └─────────────┘
```

---

## フロントエンド

### コアフレームワーク
- **Next.js 15.5.3**: App Router + Turbopack
- **React 19.1.0**: Server/Client Components

### スタイリング
- **Tailwind CSS v4**: ユーティリティファーストCSS
- **shadcn/ui**: カスタマイズ可能なコンポーネント（Radix UI + Tailwind）
- **lucide-react 0.544.0**: アイコン
- **Sonner 2.0.7**: トースト通知

### 状態管理
- **Convex React Client**: リアルタイムステート同期

### フォーム管理
- **react-hook-form 7.65.0**: フォーム状態管理
- **zod 4.1.12**: スキーマバリデーション
- **@hookform/resolvers 5.2.2**: バリデーションリゾルバー

### ユーティリティ
- **date-fns 4.1.0 + date-fns-tz 3.2.0**: 日付操作
- **clsx 2.1.1**: クラス名管理
- **tailwind-merge 3.3.1**: Tailwindクラス競合解決

---

## バックエンド

### BaaSプラットフォーム
- **Convex 1.27.1**: サーバーレスバックエンド
  - TypeScriptネイティブ
  - リアクティブクエリ（WebSocket自動同期）
  - 組み込みNoSQLデータベース

### 認証
- **@convex-dev/auth 0.0.90**: Convex統合認証
  - パスワード認証（bcrypt）
  - OTPメール認証
  - OAuth対応準備完了
- **jose 6.1.0**: JWT処理
- **@oslojs/crypto 1.0.1**: 暗号化ユーティリティ

### メール送信
- **Resend API**: OTP/パスワードリセット/招待メール

---

## 開発環境

### 言語
- **TypeScript 5.x**: strict mode有効

### テストフレームワーク
- **Vitest 3.2.4**: ユニット・統合テスト
  - `@vitest/ui 3.2.4`: テストUI
  - `happy-dom 20.0.0`: 軽量DOM環境
- **Playwright 1.56.0**: E2Eテスト
- **convex-test 0.0.38**: Convexバックエンドテスト
- **Testing Library**: Reactコンポーネントテスト
  - `@testing-library/react 16.3.0`
  - `@testing-library/jest-dom 6.9.1`
  - `@testing-library/user-event 14.6.1`

### コード品質
- **Biome 2.2.0**: Linter + Formatter（ESLint/Prettier代替）

---

## 環境変数

```env
# Convex
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_DEPLOY_KEY=your-deploy-key

# Auth
AUTH_SECRET=your-auth-secret  # openssl genpkey で生成

# Email
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

---

## 開発コマンド

```bash
# 開発
npm run dev              # Next.js開発サーバー（Turbopack）
npx convex dev           # Convex開発環境

# ビルド
npm run build            # プロダクションビルド
npx convex deploy        # Convex本番デプロイ

# コード品質
npm run lint             # Biome Lint
npm run format           # Biome Format

# テスト
npm test                 # Vitest ユニット・統合テスト
npm run test:e2e         # Playwright E2Eテスト
npm run test:coverage    # カバレッジレポート
```

---

## パフォーマンス最適化

### ビルド
- Turbopack: インクリメンタルコンパイル
- Tree Shaking: 未使用コード削除

### レンダリング
- React Server Components: サーバーサイド処理
- Streaming SSR: 段階的レンダリング

### データ
- Convex Reactive Queries: 最小データ転送
- WebSocket: 効率的リアルタイム同期

### キャッシング
- PWAキャッシング: オフライン対応
- Next.jsキャッシュ: 自動キャッシング

---

## デプロイ構成

- **フロントエンド**: Vercel（Next.js最適化）
- **バックエンド**: Convexマネージドサービス
- **認証**: Convex Auth（セルフホスト）
- **メール**: Resend API

---

## 関連ドキュメント

- [プロジェクト概要](project.md)
- [アーキテクチャ](architecture.md)
- [テスト戦略](testing-strategy.md)
