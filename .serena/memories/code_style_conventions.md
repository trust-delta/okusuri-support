# コードスタイルと規約

## Linter/Formatter
- **ツール**: Biome 2.2.0
- **設定ファイル**: `biome.json`

## フォーマットルール
- **インデント**: スペース2つ
- **インデントスタイル**: space
- **改行**: recommended

## TypeScript設定
- **strict**: true (厳格な型チェック有効)
- **any型の使用**: 禁止
- **target**: ES2017
- **moduleResolution**: bundler

## ファイル構成
### ルート構造
- `app/`: Next.js App Router ページとコンポーネント
  - `app/(private)/`: 認証が必要なページ (dashboard, settings等)
  - `app/(guest)/`: 認証不要なページ (login等)
  - `app/_shared/`: プロジェクト全体で共有されるモジュール
- `convex/`: Convex バックエンドロジック

### 共有モジュール構造 (`app/_shared/`)
- `api/`: バックエンドAPIエンドポイント (Convex API)
- `schema/`: データモデル型定義 (Doc, Id)
- `types/`: 型定義 (Result型等)
- `lib/`: ユーティリティ関数 (date-fns, logger, utils等)
- `components/`: 共有UIコンポーネント
- `features/`: 機能別のコンポーネント・ロジック

## 命名規則
- **コンポーネント**: PascalCase (例: `MedicationRecorder.tsx`)
- **ユーティリティ**: camelCase (例: `utils.ts`)
- **定数**: UPPER_SNAKE_CASE

## Import順序
- Biomeの`organizeImports`機能を使用

## パス解決
- `@/*` エイリアスで `./app/_shared/*` を参照
- 例:
  - `import { api } from "@/api"` → `app/_shared/api/index.ts`
  - `import type { Id } from "@/schema"` → `app/_shared/schema/index.ts`
  - `import { cn } from "@/lib/utils"` → `app/_shared/lib/utils.ts`

## バックエンド抽象化
- Convex特有の実装は `api/` と `schema/` 配下に隔離
- 将来的なバックエンド差し替え（Supabase、Prisma等）に備えた設計
