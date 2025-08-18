# プロジェクト概要

## プロジェクト名
okusuri-support

## プロジェクトの目的
患者本人とサポートする保護者の二人三脚で服薬管理を行うための支援アプリ。まずは記録することを目的として、患者の意思を肯定的に尊重する。記録が継続的に行えるよう支援し、また保護者は患者の服薬状況を把握し、必要に応じて適切なサポートを行える。

## 技術スタック

### フレームワーク・ライブラリ
- **Next.js 15.0.0** - React Webアプリケーションフレームワーク
- **React 19.0.0** - ユーザーインターフェースライブラリ
- **TypeScript 5.0.0** - 型安全な開発環境

### UI・スタイリング
- **Tailwind CSS 4.0.0** - ユーティリティファーストCSSフレームワーク
- **Radix UI** - アクセシブルなコンポーネントライブラリ
  - @radix-ui/react-dialog
  - @radix-ui/react-slot
- **Lucide React** - アイコンライブラリ
- **next-themes** - ダークモード対応

### 開発ツール・品質管理
- **Biome** - 高速なlinter・formatter（ESLintとPrettierの代替）
- **Vitest** - 高速なテストランナー
- **Playwright** - E2Eテストフレームワーク
- **Storybook** - コンポーネント開発環境
- **Husky + lint-staged** - Git hooks による品質チェック自動化

### その他
- **Lighthouse CI** - パフォーマンス測定
- **ts-prune** - 未使用エクスポートの検出
- **madge** - 循環依存の検出

## アーキテクチャ
Next.jsのApp Routerを使用したモダンなReactアプリケーション構成：

```
okusuri-support/
├── app/                    # Next.js App Router（ページ・ルーティング）
│   ├── layout.tsx         # ルートレイアウト
│   ├── page.tsx           # ホームページ
│   └── patient/           # 患者管理機能
├── src/                   # 共有コンポーネント・ロジック
│   ├── components/        # 再利用可能なUIコンポーネント
│   ├── features/          # 機能別コンポーネント（患者管理等）
│   ├── hooks/            # カスタムReact Hooks
│   ├── lib/              # ユーティリティライブラリ
│   ├── stores/           # 状態管理
│   ├── types/            # TypeScript型定義
│   └── utils/            # ヘルパー関数
├── tests/                # E2Eテスト
└── docs/                 # ドキュメント・開発ルール
```

## 特徴的な要素
1. **Claude Code最適化**: AI開発に特化した開発ルールとワークフロー
2. **厳格な型安全性**: any型使用禁止、unknown型+型ガードの活用
3. **包括的な品質チェック**: 6段階の品質保証プロセス
4. **多言語対応**: 日本語・英語両対応の開発環境
5. **Sub-agent活用**: 専門タスクに特化したAIエージェント連携