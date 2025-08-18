# コードスタイルと開発規約

## 言語・フレームワーク規約

### TypeScript
- **厳格な型チェック**: tsconfig.jsonで全ての厳格オプションを有効化
- **any型使用禁止**: 代わりにunknown型+型ガードを使用
- **null安全性**: strictNullChecks、noUncheckedIndexedAccess有効
- **未使用変数・パラメータの検出**: noUnusedLocals、noUnusedParameters有効

### Next.js App Router
- **ファイルベースルーティング**: app/ディレクトリを使用
- **Server/Client Components**: 適切な使い分けを実施
- **パス解決**: @/*、@/app/* エイリアスを使用

## コードフォーマット（Biome）

### 基本設定
- **インデント**: スペース2文字
- **行幅制限**: 100文字
- **セミコロン**: 必要時のみ（asNeeded）
- **クォート**: シングルクォート
- **末尾カンマ**: ES5準拠

### Lintルール
- **推奨ルール**: Biome推奨設定を基準
- **any型警告**: suspicious.noExplicitAny: "warn"
- **テストファイル例外**: テストファイルではany型使用を許可

## ファイル・ディレクトリ命名

### ディレクトリ構造
```
src/
├── components/ui/     # 再利用可能UIコンポーネント
├── features/         # 機能別コンポーネント（patient等）
├── hooks/           # カスタムReact Hooks
├── lib/             # ユーティリティライブラリ
├── stores/          # 状態管理
├── types/           # TypeScript型定義
└── utils/           # ヘルパー関数
```

### ファイル命名
- **コンポーネント**: PascalCase（PatientCard.tsx）
- **フック**: camelCase（usePatient.ts）
- **ユーティリティ**: camelCase（formatDate.ts）
- **型定義**: PascalCase（PatientType.ts）
- **テストファイル**: {name}.test.ts, {name}.spec.ts
- **Storybookファイル**: {name}.stories.tsx

## インポート・エクスポート

### インポート順序（Biome organizeImportsで自動化）
1. 外部ライブラリ
2. 内部モジュール（@/*から始まる）
3. 相対インポート

### エクスポート規約
- **デフォルトエクスポート**: コンポーネント
- **名前付きエクスポート**: ユーティリティ関数、型定義
- **インデックスファイル**: 各ディレクトリにindex.tsを配置して再エクスポート

## コンポーネント設計

### React コンポーネント
- **関数コンポーネント**: アロー関数を使用
- **Props型定義**: インターフェース使用、ジェネリクス活用
- **Hooks**: カスタムフックは use* プレフィックス
- **条件レンダリング**: 三項演算子または && 演算子

### Styled Components
- **Tailwind CSS**: ユーティリティクラス優先
- **カスタムコンポーネント**: src/components/ui/に配置
- **バリアント**: class-variance-authority使用

## Git・バージョン管理

### コミットメッセージ
- **従来の形式**: feat:, fix:, docs:, style:, refactor:, test:, chore:
- **日本語**: コミットメッセージは日本語で記述

### ブランチ戦略
- **main**: 本番環境
- **feature/***: 機能開発
- **fix/***: バグ修正

### Git Hooks
- **pre-commit**: lint-staged実行
- **コード品質**: Biome check + format自動実行