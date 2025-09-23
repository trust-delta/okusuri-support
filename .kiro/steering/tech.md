# Technology Stack Steering Document

## Architecture Overview
モダンなフルスタック TypeScript アーキテクチャを採用し、リアルタイム同期とセキュアな認証を実現するサーバーレス構成。

```
┌─────────────────┐     ┌─────────────────┐
│   Next.js 15    │────▶│     Clerk       │
│   (Frontend)    │     │  (Auth Service) │
└────────┬────────┘     └─────────────────┘
         │
         │ WebSocket
         ▼
┌─────────────────┐
│     Convex      │
│  (Backend/DB)   │
└─────────────────┘
```

## Frontend Stack
### Core Framework
- **Next.js 15.5.3**: App Router アーキテクチャ採用
  - Turbopack 使用による高速ビルド
  - Server Components と Client Components の適切な使い分け
  - PWA サポート

### UI Framework
- **React 19.1.0**: 最新の React 機能活用
- **React DOM 19.1.0**: クライアントサイドレンダリング

### Styling
- **Tailwind CSS v4**: ユーティリティファーストCSS
  - PostCSS 統合
  - tw-animate-css によるアニメーション拡張
  - CSS-in-JS 不使用の軽量実装

### UI Components
- **Radix UI**: アクセシブルなヘッドレスコンポーネント
  - `@radix-ui/react-slot`: 柔軟なコンポーネント合成
- **shadcn/ui パターン**: カスタマイズ可能なコンポーネント
- **lucide-react 0.544.0**: 一貫性のあるアイコンシステム
- **Sonner 2.0.7**: トースト通知システム

### State Management
- **Convex React Client**: リアルタイムステート同期
- **SWR** (optional): データフェッチング最適化

### Utilities
- **clsx 2.1.1**: 条件付きクラス名管理
- **class-variance-authority 0.7.1**: バリアント管理
- **tailwind-merge 3.3.1**: Tailwindクラス競合解決

## Backend Stack
### BaaS Platform
- **Convex 1.27.1**: リアルタイムバックエンド
  - TypeScript ネイティブなスキーマ定義
  - リアクティブクエリ
  - オートスケーリング
  - WebSocket による自動同期

### Authentication
- **Clerk 6.32.0**: 認証・認可サービス
  - `@clerk/nextjs`: Next.js 統合
  - OAuth プロバイダー対応
  - セッション管理
  - マルチファクター認証対応

### API Layer
- **Convex Functions**: サーバーレスファンクション
  - Query functions: リアルタイムデータ取得
  - Mutation functions: データ更新
  - Action functions: 外部API連携

## Development Environment
### Language
- **TypeScript 5.x**: 型安全性の確保
  - Strict mode 有効
  - Path aliases 設定 (`@/*`)

### Code Quality
- **Biome 2.2.0**: 高速な Linter/Formatter
  - ESLint/Prettier 代替
  - Next.js/React ルール適用
  - Import 自動整理

### Build Tools
- **Next.js Turbopack**: 高速開発サーバー
- **PostCSS**: CSS 処理パイプライン
- **Tailwind CSS v4**: JIT コンパイル

### Version Control
- **Git**: バージョン管理
- **.gitignore**: 適切なファイル除外設定

## Common Commands
```bash
# Development
npm run dev          # 開発サーバー起動 (Turbopack)

# Build & Production
npm run build        # プロダクションビルド (Turbopack)
npm start            # プロダクションサーバー起動

# Code Quality
npm run lint         # Biome によるリント
npm run format       # Biome によるフォーマット

# Convex Development
npx convex dev       # Convex開発環境起動
npx convex deploy    # Convex本番デプロイ
```

## Environment Variables
### Required Variables
```env
# Convex Configuration
NEXT_PUBLIC_CONVEX_URL=     # Convex デプロイメントURL
CONVEX_DEPLOY_KEY=           # Convex デプロイキー

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=  # Clerk公開キー
CLERK_SECRET_KEY=                    # Clerkシークレットキー

# Optional Clerk Routes
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
```

### Development vs Production
- `.env.local`: ローカル開発用（Git管理外）
- `.env.production`: 本番環境用（機密情報は環境変数として注入）

## Port Configuration
```yaml
Development:
  Next.js: 3000       # デフォルト開発サーバー
  Convex:  3210       # Convex Admin Dashboard

Production:
  Next.js: 80/443     # Vercel/Cloud デプロイ
  Convex:  Managed    # Convexクラウド管理
```

## Performance Optimizations
- **Turbopack**: インクリメンタルコンパイル
- **React Server Components**: サーバーサイド処理
- **Convex Reactive Queries**: 最小限のデータ転送
- **PWA キャッシング**: オフライン対応
- **画像最適化**: Next.js Image コンポーネント

## Security Considerations
- **Clerk認証**: エンタープライズグレードのセキュリティ
- **Convex権限**: ロールベースアクセス制御
- **環境変数管理**: シークレット分離
- **CSP ヘッダー**: XSS 対策
- **HTTPS強制**: 暗号化通信

## Deployment Strategy
- **Frontend**: Vercel推奨（Next.js最適化済み）
- **Backend**: Convexマネージドサービス
- **認証**: Clerk SaaS
- **CI/CD**: GitHub Actions統合可能