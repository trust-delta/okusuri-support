# プロジェクト概要

**最終更新**: 2025年11月30日

---

## 基本情報

- **アプリケーション名**: おくすりサポート
- **プロジェクトタイプ**: WEBアプリケーション（個人開発）

---

## プロダクトビジョン

### ミッション

患者の服薬アドヒアランス向上を目指し、患者と支援者が共同利用できる服薬管理プラットフォームを提供する。

### ターゲットユーザー

**主利用者（患者）**

- 独力での服薬管理が困難な患者
- 定期的な服薬が必要だが忘れやすい方

**支援者（家族・介護者）**

- 独力での服薬管理が困難な患者を家族にもつ方
- 患者の服薬状況を確認したい方

---

## 主要機能

- 認証機能（Convex Auth: パスワード/OTP）
- 服薬管理基本機能（記録・履歴・リマインダー）
- グループ管理機能（作成・編集・削除・メンバー管理）
- 複数グループ所属機能（グループ切り替え）
- グループ招待機能（招待コード/リンク）
- オンボーディング機能（ロール選択）

---

## 技術スタック

### 開発環境

- **パッケージマネージャー**: pnpm 10.19.0
- **Git hooks**: husky 9.x + lint-staged 16.x（コミット時自動フォーマット）

### フロントエンド

#### コアフレームワーク

- **Next.js 15.5.3**: App Router + Turbopack
- **React 19.1.0**: Server/Client Components

#### スタイリング

- **Tailwind CSS v4**: ユーティリティファーストCSS
- **shadcn/ui**: カスタマイズ可能なコンポーネント（Radix UI + Tailwind）
- **lucide-react 0.544.0**: アイコン
- **Sonner 2.0.7**: トースト通知

#### 状態管理

- **Convex React Client**: リアルタイムステート同期

#### フォーム管理

- **react-hook-form 7.65.0**: フォーム状態管理
- **zod 4.1.12**: スキーマバリデーション
- **@hookform/resolvers 5.2.2**: バリデーションリゾルバー

#### ユーティリティ

- **date-fns 4.1.0 + date-fns-tz 3.2.0**: 日付操作
- **clsx 2.1.1**: クラス名管理
- **tailwind-merge 3.3.1**: Tailwindクラス競合解決

### バックエンド

### BaaSプラットフォーム

- **Convex 1.27.1**: サーバーレスバックエンド
  - TypeScriptネイティブ
  - リアクティブクエリ（WebSocket自動同期）
  - 組み込みNoSQLデータベース

#### 認証

- **@convex-dev/auth 0.0.90**: Convex統合認証
  - パスワード認証（bcrypt）
  - OTPメール認証
  - OAuth対応準備完了
- **jose 6.1.0**: JWT処理
- **@oslojs/crypto 1.0.1**: 暗号化ユーティリティ

#### メール送信

- **Resend API**: OTP/パスワードリセット/招待メール

---

## アーキテクチャ概要

Feature-Based Architecture

詳細は[architecture.md](architecture.md)を参照

---

## コーディング規約

### TypeScript

- **strict mode**: 必須
- **any型**: 禁止
- **ファイルサイズ**: 最大300行
- **循環依存**: 禁止

### 命名規則

- **ファイル**: kebab-case（`user-service.ts`）
- **クラス**: PascalCase（`UserService`）
- **関数・変数**: camelCase（`getUserById`）
- **定数**: UPPER_SNAKE_CASE（`MAX_RETRY_COUNT`）
- **型**: `I`プレフィックス不要（`User`）

---

## テスト戦略

### カバレッジ目標

- **ユニットテスト**: 80%以上
- **統合テスト**: すべてのAPI
- **E2Eテスト**: クリティカルパス

詳細は[testing-strategy.md](testing-strategy.md)を参照。

---

##　デプロイ戦略

- **フロントエンド**: Vercel
- **バックエンド**: Convex
- **CI/CD**: GitHub Actions（計画中）

---

## 収益モデル

- 月額無料
- 実費発生時点で広告収入
- 買い切り課金で広告OFF
