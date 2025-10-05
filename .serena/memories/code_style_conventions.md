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
- `src/app/`: Next.js App Router ページ
- `src/components/`: React コンポーネント
- `src/lib/`: ユーティリティ関数
- `convex/`: Convex バックエンドロジック

## 命名規則
- **コンポーネント**: PascalCase (例: `MedicationRecorder.tsx`)
- **ユーティリティ**: camelCase (例: `utils.ts`)
- **定数**: UPPER_SNAKE_CASE

## Import順序
- Biomeの`organizeImports`機能を使用

## パス解決
- `@/*` エイリアスで `./src/*` を参照
