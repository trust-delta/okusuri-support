# プロジェクト概要

## プロジェクト名
おくすりサポート（okusuri-support）

## 目的
精神疾患患者の服薬アドヒアランス低下（服薬忘れ・中断による症状悪化）を解決する服薬管理アプリケーション

## ターゲットユーザー
- **主利用者**: 精神疾患を持つ患者（独力での服薬管理が困難な方）
- **支援者**: 患者の家族・介護者（1患者あたり0-3名想定）

## 技術スタック
- **フロントエンド**: Next.js 15 (React 19, TypeScript 5)
- **バックエンド**: Convex (リアルタイムバックエンド)
- **認証**: Convex Auth with GitHub OAuth
- **スタイリング**: Tailwind CSS 4
- **UI コンポーネント**: Radix UI, Lucide React
- **日時処理**: date-fns, date-fns-tz
- **Linter/Formatter**: Biome 2.2.0

## 主要機能
- グループベースの服薬管理
- ロールベースアクセス制御（服薬者/サポーター）
- 服薬記録の作成・追跡
- GitHub OAuth認証
- オンボーディングフロー

## 共有モジュール構造
プロジェクトは `app/_shared/` 配下に役割ごとに分離された共有モジュールを持つ：

### バックエンドアクセス層
- `app/_shared/api/`: Convex API エンドポイント (`api`) の再エクスポート
- `app/_shared/schema/`: データモデル型定義 (`Doc`, `Id`) の再エクスポート

### 型定義
- `app/_shared/types/`: 型定義（例: Result型）

### ユーティリティ
- `app/_shared/lib/`: ユーティリティ関数（date-fns、logger、utils等）

### UIとビジネスロジック
- `app/_shared/components/`: 共有UIコンポーネント
- `app/_shared/features/`: 機能別のコンポーネント・ロジック

この構造により、将来的なバックエンド差し替え（Convex → Supabase/Prisma等）が容易になる。
