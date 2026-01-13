# おくすりサポート（服薬管理アプリ）

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=nextjs)](https://nextjs.org/)
[![PWA](https://img.shields.io/badge/PWA-Enabled-green?logo=pwa)](https://developer.mozilla.org/docs/Web/Progressive_web_apps)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## プロジェクト概要

患者の**服薬アドヒアランス向上**を目指し、患者と支援者が共同利用できる服薬管理プラットフォームです。

### 解決する課題

患者の**服薬アドヒアランス低下**（服薬忘れ・中断による症状悪化）の解決

### ターゲットユーザー

| ユーザータイプ | 説明 |
| --- | --- |
| **主利用者（患者）** | 独力での服薬管理が困難な方、定期的な服薬が必要だが忘れやすい方 |
| **支援者（家族・介護者）** | 患者の服薬状況を確認・サポートしたい方（1患者あたり0-3名想定） |

---

## 主要機能

- **認証機能**: パスワード認証 / OTPメール認証
- **服薬管理**: 薬の登録・服薬記録・履歴確認
- **リマインダー**: プッシュ通知による服薬リマインド
- **グループ管理**: 患者・支援者間でのグループ共有
- **招待機能**: 招待コード/リンクによるメンバー追加
- **オンボーディング**: ロール選択（患者/支援者）

---

## 技術スタック

### フロントエンド

| カテゴリ | 技術 |
| --- | --- |
| フレームワーク | Next.js 15 (App Router + Turbopack) |
| UI | React 19, Tailwind CSS v4, shadcn/ui |
| フォーム | react-hook-form + zod |
| 日付処理 | date-fns + date-fns-tz |

### バックエンド

| カテゴリ | 技術 |
| --- | --- |
| BaaS | Convex（サーバーレス + リアルタイム同期） |
| 認証 | @convex-dev/auth（パスワード / OTP） |
| メール | Resend API |
| モニタリング | Sentry |

### 開発環境

| カテゴリ | 技術 |
| --- | --- |
| パッケージマネージャー | pnpm |
| テスト | Vitest + Testing Library + Playwright |
| リンター/フォーマッター | Biome |
| Git hooks | husky + lint-staged |

---

## 開発環境構築

### 必要条件

- Node.js 22.x
- pnpm 10.x

### セットアップ

```bash
# リポジトリをクローン
git clone https://github.com/your-username/okusuri-support.git
cd okusuri-support

# 依存関係をインストール
pnpm install

# 環境変数を設定
cp .env.example .env
cp .env.local.example .env.local
# .env と .env.local を編集して必要な値を設定

# Convex開発サーバーを起動（別ターミナル）
npx convex dev

# Next.js開発サーバーを起動
pnpm dev
```

開発サーバーが起動したら http://localhost:3000 にアクセスしてください。

---

## スクリプト一覧

| コマンド | 説明 |
| --- | --- |
| `pnpm dev` | 開発サーバー起動（Turbopack） |
| `pnpm build` | プロダクションビルド |
| `pnpm start` | プロダクションサーバー起動 |
| `pnpm lint` | Biomeによるリント |
| `pnpm format` | Biomeによるフォーマット |
| `pnpm test` | ユニットテスト実行 |
| `pnpm test:ui` | Vitest UIでテスト実行 |
| `pnpm test:coverage` | カバレッジ付きテスト |
| `pnpm test:e2e` | E2Eテスト実行（Playwright） |
| `pnpm test:e2e:ui` | Playwright UIモードでE2Eテスト |

---

## ディレクトリ構造

```
okusuri-support/
├── app/                    # Next.js App Router
│   ├── (auth)/             # 認証関連ページ
│   ├── (protected)/        # 認証必須ページ
│   └── _shared/            # 共有コンポーネント・機能
│       ├── components/     # 共通UIコンポーネント
│       └── features/       # 機能モジュール
│           ├── auth/       # 認証機能
│           ├── group/      # グループ管理
│           ├── medication/ # 服薬管理
│           └── push-notifications/  # プッシュ通知
├── convex/                 # Convexバックエンド
│   ├── schema.ts           # データベーススキーマ
│   ├── auth/               # 認証関連
│   ├── groups/             # グループ関連
│   └── medications/        # 服薬関連
├── e2e/                    # E2Eテスト
├── public/                 # 静的ファイル
└── .context/               # プロジェクトドキュメント
    ├── project.md          # プロジェクト概要
    ├── architecture.md     # アーキテクチャ
    ├── decisions/          # 決定記録（ADR）
    └── specs/              # 詳細仕様書
```

---

## アーキテクチャ

Feature-Based Architecture（機能ベース）を採用。詳細は [.context/architecture.md](./.context/architecture.md) を参照。

```
┌─────────────┐     ┌──────────────┐
│  Next.js 15 │────▶│ Convex Auth  │
│  (Frontend) │     │(authenticate)│
└──────┬──────┘     └──────────────┘
       │ WebSocket
       ▼
┌─────────────┐     ┌─────────────┐
│   Convex    │────▶│   Resend    │
│ (Backend)   │     │   (Email)   │
└─────────────┘     └─────────────┘
```

---

## ドキュメント

詳細なドキュメントは `.context/` ディレクトリにあります。

- [プロジェクト概要](./.context/project.md)
- [アーキテクチャ](./.context/architecture.md)
- [コーディング規約](./.context/coding-style.md)
- [テスト戦略](./.context/testing-strategy.md)
- [決定記録](./.context/decisions/)

---

## ライセンス

[MIT License](LICENSE)
