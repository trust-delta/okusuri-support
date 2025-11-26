# Claude Code AI 向けルール

## 最重要: コンテキストファイルの参照

**必ず `.context/` ディレクトリを確認すること**

- `.context/` は本プロジェクトの最重要ドキュメント群です
- **実装内容より `.context/` の内容が優先されます**
- プロジェクト概要、アーキテクチャ、技術スタック、決定記録、仕様書、手順書、実装計画・進捗などが全て記載されています
- ユーザからの指示を受けた際は、まず関連する `.context/` 内のドキュメントを読むこと

### 参照すべきドキュメント

- [.context/project.md](./.context/project.md) - プロジェクト情報、技術スタック
- [.context/architecture.md](./.context/architecture.md) - アーキテクチャ
- [.context/coding-style.md](./.context/coding-style.md) - コーディング規則
- [.context/coding-style.md](./.context/error-handling.md) - エラーハンドリング
- [.context/testing-strategy.md](./.context/testing-strategy.md) - テスト戦略
- [.context/decisions/](./.context/decisions/) - 決定記録
- [.context/runbook/](./.context/runbook/) - 作業手順書
- [.context/specs/](./.context/specs/) - 詳細仕様書

## 言語について

- 応答は全て日本語で行うこと
- コミットメッセージなども日本語で記述すること

## TypeScript

- any 型を使用しないこと
- 型安全性を最優先すること

## アーキテクチャ・設計判断

- `.context/decisions/` に記載された決定記録を尊重すること
- 決定記録で決定された技術選定や設計方針に従うこと
- 新たな技術的決定を行う場合は、決定記録として記録することを提案すること

## 仕様書の作成と同期

- 新規機能を開発する際は、`.context/specs/` に仕様書を作成すること
- **仕様書と実装は常に同期していること**
- 実装を変更した場合は、仕様書も即座に更新すること
- 仕様書が存在しない機能を実装する場合は、まず仕様書の作成を提案すること
