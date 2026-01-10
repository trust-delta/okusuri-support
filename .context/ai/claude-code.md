# Claude Code 設定・機能概要

このドキュメントでは、本プロジェクトで利用している Claude Code 固有の設定や機能について概説します。

## ディレクトリ構造

```
.claude/
├── commands/         # カスタムスラッシュコマンド（現在未使用）
├── skills/           # スキル定義とスクリプト
├── settings.json     # プロジェクト設定（共有）
└── settings.local.json  # ローカル設定（個人環境依存）
```

---

## サブエージェント（Agents）

本プロジェクトでは、Claude Code 標準の組み込みサブエージェントを使用します。
プロジェクト固有のルール（`.context/` 参照、コーディング規約など）は CLAUDE.md で定義されており、
すべてのサブエージェントに適用されます。

### 主な組み込みサブエージェント

| エージェント | 説明 |
|-------------|------|
| Explore | コードベースの探索・検索 |
| Plan | 実装計画の策定 |
| general-purpose | 汎用タスク |

### 使用例

```
Task(subagent_type="Explore"):
「認証関連のコードを探して」

Task(subagent_type="Plan"):
「通知機能の実装計画を立てて」
```

---

## スキル（Skills）

スキルは特定のタスク領域を自動化・支援するためのツールで、Skill ツールで呼び出されます。

### 利用可能なスキル一覧

| スキル | 説明 |
|--------|------|
| decision-assistant | 技術的意思決定を構造化して記録する。重要な設計判断、技術選定、アーキテクチャ決定を記録する際に使用。 |
| spec-assistant | .context/specs/ に仕様書を作成・更新・検証する。実装変更時の同期チェックも行う。 |
| review-assistant | 変更コードの品質・セキュリティ・パフォーマンスをチェックする。PR作成前のセルフレビューに使用。 |
| git-workflow | プロジェクトのGit規則に従ってブランチ・コミット・PRを作成する。 |
| production-readiness | 本番環境への準備状況を包括的にチェックする。 |
| browser-verify | Chrome DevTools MCPを使った実装検証・自動修正。 |
| radix-ui-patterns | shadcn/ui と Radix UI コンポーネントの実装・テストパターン。 |
| convex-test-guide | Convexバックエンドのテスト作成ガイド。 |

### スキル設計原則（Claude公式ベストプラクティス準拠）

- **段階的開示パターン**: SKILL.mdは機能索引として、必要な詳細ガイドのみを選択的に読み込む
- **簡潔なエントリーポイント**: SKILL.mdは500行以下、理想は100行前後
- **機能別分離**: 各機能を独立したガイドで管理
- **コンテキスト効率**: 不要な情報を読み込まず、コンテキストウィンドウを効率的に使用

### 各スキルの詳細

#### 1. decision-assistant

- **説明**: 技術的意思決定を構造化して記録する
- **利用可能な機能**: 新規作成、検索、検証、分析
- **出力先**: `.context/decisions/YYYY-MM-DD-[topic].md`

#### 2. spec-assistant

- **説明**: 仕様書を作成・更新・検証し、実装との同期をチェックする
- **利用可能な機能**: 機能仕様作成、API仕様作成、仕様書更新、仕様書検証、関連検索、同期チェック
- **出力先**:
  - 機能仕様: `.context/specs/features/[feature-name].md`
  - API仕様: `.context/specs/api/[feature-name]-api.md`

#### 3. review-assistant

- **説明**: 変更コードの品質・セキュリティ・パフォーマンスをチェックする
- **利用可能な機能**: コード品質チェック、セキュリティチェック、パフォーマンスチェック、本番デプロイ前チェック、プライバシーチェック、アクセシビリティチェック

#### 4. git-workflow

- **説明**: プロジェクトのGit規則に従ってブランチ・コミット・PRを作成する
- **利用可能な機能**: ブランチ作成、コミット作成、PR作成

#### 5. production-readiness

- **説明**: 本番環境への準備状況を包括的にチェックする
- **チェックカテゴリ**: セキュリティ、監視・ロギング、パフォーマンス、品質、運用

#### 6. browser-verify

- **説明**: Chrome DevTools MCPを使った実装検証・自動修正
- **利用可能な機能**: ページ巡回、コンソールエラー検知、自動修正、再検証

#### 7. radix-ui-patterns

- **説明**: shadcn/ui と Radix UI コンポーネントの実装・テストパターン
- **用途**: UIコンポーネントの実装時、テスト作成時

#### 8. convex-test-guide

- **説明**: Convexバックエンドのテスト作成ガイド
- **用途**: Convex関数のテスト作成時

---

## 参照ドキュメント

以下のドキュメントはスキルではなく、参照用ドキュメントとして利用できます。

### セキュリティ

バックエンドコードのセキュリティガイダンスは `.context/security/` に配置されています。

- **概要**: [.context/security/backend-boundary-security.md](../security/backend-boundary-security.md)
- **Convexパターン**: [.context/security/patterns/convex/README.md](../security/patterns/convex/README.md)
- **チェックリスト**: [.context/security/checklist/code-review.md](../security/checklist/code-review.md)

---

## 設定ファイル（Settings）

### 1. settings.json（プロジェクト共有設定）

- **パス**: [.claude/settings.json](../../.claude/settings.json)
- **共有**: リポジトリにコミットされ、チーム全体で共有
- **内容**: 現在は空（`{}`）。プロジェクト共通のフックや設定を追加する場合に使用

### 2. settings.local.json（個人環境設定）

- **パス**: `.claude/settings.local.json`
- **共有**: `.gitignore`で除外され、個人環境のみで有効
- **内容**: 権限設定、フック、ステータスラインなど

---

## ルート設定ファイル（CLAUDE.md）

### プロジェクト固有ルール（CLAUDE.md）

- **パス**: `CLAUDE.md`
- **目的**: プロジェクト全体で遵守すべきルールの定義
- **内容**:
  - **最重要**: `.context/` ディレクトリの参照を必須化
  - **言語**: 応答・コミットメッセージを日本語で記述
  - **TypeScript**: `any` 型の使用禁止、型安全性優先
  - **アーキテクチャ・設計判断**: `.context/decisions/` の決定記録を尊重
  - **仕様書の作成と同期**: 仕様書と実装の常時同期を義務化

---

## 利用の流れ

1. **スキル呼び出し**: ユーザーが特定タスクを依頼
   - 例: 「通知機能の仕様書を作成して」→ `Skill(spec-assistant)`
   - 例: 「技術決定を記録して」→ `Skill(decision-assistant)`

2. **サブエージェント呼び出し**: 組み込みの Task ツールで専門エージェントに委譲
   - 例: コードベース探索 → `Task(subagent_type=Explore)`
   - 例: 実装計画策定 → `Task(subagent_type=Plan)`

3. **仕様書同期**: 実装変更後は `Skill(spec-assistant)` の同期チェック機能で整合性を確認

---

## 参考リンク

- **決定記録**: [.context/decisions/](../decisions/)
- **仕様書**: [.context/specs/](../specs/)
- **手順書**: [.context/runbooks/](../runbooks/)
- **セキュリティ**: [.context/security/](../security/)
- **プロジェクト情報**: [.context/project.md](../project.md)
- **アーキテクチャ**: [.context/architecture.md](../architecture.md)
- **コーディング規則**: [.context/coding-style.md](../coding-style.md)
- **エラーハンドリング**: [.context/error-handling.md](../error-handling.md)
- **テスト戦略**: [.context/testing-strategy.md](../testing-strategy.md)
