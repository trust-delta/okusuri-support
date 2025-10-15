# .ai/ - AI開発コンテキスト

**最終更新**: 2025年10月16日

AI支援開発に必要なプロジェクトのコンテキスト情報を格納しています。

---

## ディレクトリ構成

```
.ai/
├── README.md (このファイル)
├── context/              # プロジェクトコンテキスト
│   ├── project.md
│   ├── tech-stack.md
│   ├── architecture.md
│   ├── testing-strategy.md
│   ├── error-handling.md
│   └── adr/
└── spec/                 # 仕様書
    ├── README.md
    ├── features/         # 機能仕様書
    │   ├── auth.md
    │   ├── group.md
    │   ├── medication.md
    │   └── onboarding.md
    ├── api/              # API仕様
    │   └── conventions.md
    └── templates/        # 仕様書テンプレート
        ├── api.template.md
        └── feature.template.md
```

---

## 主要ドキュメント

### context/ - プロジェクトコンテキスト

#### [context/project.md](context/project.md)
プロジェクト概要、ビジョン、主要機能、ロードマップ

#### [context/tech-stack.md](context/tech-stack.md)
技術スタック（Next.js 15, React 19, Convex, TypeScript等）

#### [context/architecture.md](context/architecture.md)
システムアーキテクチャ、データモデル、API設計

#### [context/testing-strategy.md](context/testing-strategy.md)
テスト戦略（ユニット70%, 統合20%, E2E 10%）

#### [context/error-handling.md](context/error-handling.md)
エラーハンドリング戦略、ユーザーフィードバック

#### [context/adr/](context/adr/)
Architecture Decision Records（重要なアーキテクチャ決定記録）

### spec/ - 仕様書

#### [spec/features/](spec/features/)
実装済み機能の詳細仕様書
- **auth.md**: 認証機能
- **group.md**: グループ管理
- **medication.md**: 服薬管理
- **onboarding.md**: オンボーディング

#### [spec/api/conventions.md](spec/api/conventions.md)
Convex API設計の統一規約（命名、認証、エラーハンドリング等）

#### [spec/templates/](spec/templates/)
新規仕様書作成時のテンプレート
- **api.template.md**: API仕様書テンプレート
- **feature.template.md**: 機能仕様書テンプレート

---

## 設計原則

### 1. フレームワーク非依存
特定のAI開発フレームワークに依存しない汎用コンテキスト

### 2. 軽量性
各ドキュメントは200行以内を目安

### 3. 相互参照
Markdownリンクで関連情報にすぐアクセス

### 4. 最新性の維持
各ドキュメントに最終更新日を明記

---

## 使い方

### AI開発時
AIエージェント（Claude Code等）がこのディレクトリを参照してプロジェクトのコンテキストを理解

### 開発者向け
- 新機能開発前: `spec/features/`で類似機能を確認
- アーキテクチャ決定時: `context/adr/`にADRを追加
- 重要な変更後: 該当ドキュメントを更新

---

## メンテナンス

### 更新タイミング
- プロジェクト構成変更: `context/project.md`
- 技術スタック変更: `context/tech-stack.md`
- アーキテクチャ変更: `context/architecture.md` + ADR追加
- 機能追加・変更: `spec/features/`に追加・更新

### 更新手順
1. 該当ドキュメントを編集
2. 最終更新日を変更
3. 関連リンクを確認
4. コミット

---

## 関連ディレクトリ

### `.kiro/`（Kiro SSD専用）
`.kiro/steering/`にも類似のドキュメントがありますが、Kiro SSD固有の設定です。

**将来的な方針**: `.kiro/`が削除されても`.ai/`のみでコンテキストが完結するよう設計

### `CLAUDE.md`（Claude Code設定）
Claude Codeの設定ファイル。`.ai/`の存在を参照

---

## バージョン管理

全ファイルはGit管理下にあります。

```bash
git add .ai/
git commit -m "更新: 機能仕様書をspec/featuresに整理"
```

---

## FAQ

**Q: `.kiro/steering/`との違いは？**
A: `.ai/`はフレームワーク非依存の汎用コンテキスト

**Q: 200行制限の理由は？**
A: AIの読み込みパフォーマンスと人間の可読性を両立

**Q: 新しいドキュメントを追加したい場合は？**
A: 該当ディレクトリ配下に作成し、各README.mdに追加

---

## 参考

- [ADR: コンテキスト駆動開発の導入](context/adr/2025-10-16-context-driven-development.md)
