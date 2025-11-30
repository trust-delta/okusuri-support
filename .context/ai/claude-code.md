# Claude Code 設定・機能概要

このドキュメントでは、本プロジェクトで利用している Claude Code 固有の設定や機能について概説します。

## ディレクトリ構造

```
.claude/
├── agents/           # サブエージェント定義
├── commands/         # カスタムスラッシュコマンド（現在未使用）
├── skills/           # スキル定義とスクリプト
├── settings.json     # プロジェクト設定（共有）
└── settings.local.json  # ローカル設定（個人環境依存）
```

---

## サブエージェント（Agents）

サブエージェントは特定の役割に特化したエージェントで、親エージェントから Task ツールで呼び出されます。

### 利用可能なエージェント一覧

| エージェント | 説明 | モデル | 並列化 |
|-------------|------|--------|:------:|
| error-fixer | 型エラー、Lintエラー、コンパイルエラーを修正する。npm run type-check/lint/build でエラーが発生した際に使用する。 | opus | ◎ |
| code-implementer | 小規模なコード実装（1-3ファイル程度）を行う。新規コンポーネント作成、API関数追加、既存コードの拡張に使用する。 | opus | △ |
| test-runner | Vitest/Playwrightテストを実行し、結果を分析する。テスト実行、失敗原因の特定、カバレッジ確認に使用する。 | opus | ○ |
| security-audit | コードベースのセキュリティリスクを検出してレポートする。認証・認可の保護範囲、機密情報のハードコード、脆弱性パターンを監査する際に使用する。 | opus | ◎ |
| dependency-checker | 依存関係の脆弱性と更新状況を検出してレポートする。pnpm audit、outdated確認、本番リリース前のセキュリティチェックに使用する。 | sonnet | × |
| file-migrator | 複数ファイルに同じパターンの変更を並列適用する。importパス変更、API移行、命名規則統一などの一括変更に使用する。 | opus | ◎ |
| test-generator | コンポーネントや関数のテストコードを並列生成する。複数ファイルのテスト追加、テストカバレッジ向上に使用する。 | opus | ◎ |
| doc-generator | コードのJSDoc/ドキュメントを並列生成する。複数ファイルへのJSDoc追加、API仕様書生成に使用する。 | opus | ◎ |

> **並列化凡例**: ◎高（大量タスクで劇的効果）/ ○中（中程度の効果）/ △低 / ×なし

### 選択フローチャート

```
ユーザーのリクエスト
         │
         ▼
   ┌─────────────────┐
   │ エラーが発生？   │
   └────────┬────────┘
            │
     ┌──────┴──────┐
     │             │
   Yes            No
     │             │
     ▼             ▼
┌─────────┐  ┌─────────────────┐
│error-   │  │ 新機能の実装？   │
│fixer    │  └────────┬────────┘
└─────────┘           │
                ┌─────┴─────┐
                │           │
              Yes          No
                │           │
                ▼           ▼
          ┌──────────┐  メインエージェントで
          │code-     │  直接対応
          │implementer│
          └──────────┘
```

### 1. error-fixer

- **役割**: エラー修正専門
- **利用ツール**: Read, Write, Edit, Glob, Grep, Bash, Skill
- **責任範囲**:
  - ✅ 型エラーの修正
  - ✅ Lintエラーの修正
  - ✅ コンパイルエラーの修正
  - ❌ 新規機能の実装（code-implementerが担当）

**呼び出し例**:
```
Task(subagent_type="error-fixer"):
「以下の型エラーを修正してください:
- src/features/medication/components/MedicationList.tsx:42
  Type 'string' is not assignable to type 'number'
」
```

### 2. code-implementer

- **役割**: コード実装専門
- **利用ツール**: Read, Write, Edit, Glob, Grep, Bash, Skill
- **責任範囲**:
  - ✅ 新規機能の実装（小〜中規模）
  - ✅ 既存機能の拡張
  - ✅ リファクタリング
  - ❌ エラー修正のみ（error-fixerが担当）

**呼び出し例**:
```
Task(subagent_type="code-implementer"):
「以下の機能を実装してください:
- 機能: 処方箋の複製
- 仕様: 既存の処方箋をコピーして新しい処方箋を作成
- 参照: convex/prescription/mutations.ts の既存パターン
」
```

### 3. test-runner

- **役割**: テスト実行専門
- **利用ツール**: Read, Glob, Grep, Bash
- **責任範囲**:
  - ✅ テストの実行（Playwright, Vitest）
  - ✅ テスト結果の分析
  - ✅ 失敗原因の特定
  - ❌ テストコードの修正（error-fixerまたはcode-implementerが担当）

**呼び出し例**:
```
Task(subagent_type="test-runner"):
「以下のテストを実行して結果を分析してください:
- npm run test
- 失敗したテストがあれば原因を特定
」
```

### 4. security-audit

- **役割**: セキュリティ監査専門
- **利用ツール**: Read, Glob, Grep, Bash
- **責任範囲**:
  - ✅ 認証・認可の保護範囲確認
  - ✅ セキュリティヘッダー設定確認
  - ✅ 機密情報のハードコード検出
  - ✅ 脆弱性パターンの検出
  - ❌ コードの修正（報告のみ）

**呼び出し例**:
```
Task(subagent_type="security-audit"):
「コードベース全体のセキュリティ監査を実施してください:
- 認証・認可の保護範囲
- セキュリティヘッダー設定
- 機密情報のハードコード検出
」
```

### 5. dependency-checker

- **役割**: 依存関係チェック専門
- **利用ツール**: Read, Glob, Grep, Bash
- **責任範囲**:
  - ✅ npm audit の実行と結果分析
  - ✅ 脆弱性の重大度分類
  - ✅ 更新可能なパッケージの検出
  - ❌ パッケージの自動更新（報告のみ）

**呼び出し例**:
```
Task(subagent_type="dependency-checker"):
「依存関係の脆弱性と更新状況を確認してください:
- pnpm audit の実行
- 更新可能なパッケージの一覧
- 推奨アクションの提案
」
```

### 6. file-migrator

- **役割**: ファイル一括変更専門
- **利用ツール**: Read, Write, Edit, Glob, Grep, Bash
- **責任範囲**:
  - ✅ import パスの一括変更
  - ✅ API の移行（旧→新）
  - ✅ 命名規則の統一
  - ✅ 設定ファイルの一括更新
  - ❌ ロジックの変更（code-implementerが担当）

**呼び出し例**:
```
# 並列実行: 複数の file-migrator を同時起動
Task(subagent_type="file-migrator"):
「以下のファイルのimportパスを変更してください:
- 対象: src/features/medication/**/*.ts
- 変更: @/lib/utils → @/shared/utils
」

Task(subagent_type="file-migrator"):
「以下のファイルのimportパスを変更してください:
- 対象: src/features/prescription/**/*.ts
- 変更: @/lib/utils → @/shared/utils
」
```

### 7. test-generator

- **役割**: テストコード生成専門
- **利用ツール**: Read, Write, Edit, Glob, Grep, Bash
- **責任範囲**:
  - ✅ コンポーネントテストの生成
  - ✅ ユーティリティ関数テストの生成
  - ✅ Convex関数テストの生成
  - ✅ テストパターンの分析・適用
  - ❌ テストの実行・分析（test-runnerが担当）

**呼び出し例**:
```
# 並列実行: 複数の test-generator を同時起動
Task(subagent_type="test-generator"):
「以下のコンポーネントのテストを生成してください:
- src/features/medication/components/MedicationList.tsx
- src/features/medication/components/MedicationCard.tsx
」

Task(subagent_type="test-generator"):
「以下のコンポーネントのテストを生成してください:
- src/features/prescription/components/PrescriptionList.tsx
- src/features/prescription/components/PrescriptionCard.tsx
」
```

### 8. doc-generator

- **役割**: ドキュメント生成専門
- **利用ツール**: Read, Write, Edit, Glob, Grep
- **責任範囲**:
  - ✅ 関数・メソッドのJSDoc生成
  - ✅ TypeScript型のドキュメントコメント生成
  - ✅ Convex関数のJSDoc生成
  - ✅ Reactコンポーネントのpropsドキュメント生成
  - ❌ 仕様書の作成（spec-assistantスキルが担当）

**呼び出し例**:
```
# 並列実行: 複数の doc-generator を同時起動
Task(subagent_type="doc-generator"):
「以下のファイルにJSDocを追加してください:
- convex/medication/queries.ts
- convex/medication/mutations.ts
」

Task(subagent_type="doc-generator"):
「以下のファイルにJSDocを追加してください:
- convex/prescription/queries.ts
- convex/prescription/mutations.ts
」
```

### メインエージェントで対応するケース

以下の場合はサブエージェントを使用せず、メインエージェントが直接対応します：

1. **大規模な機能実装**: 4ファイル以上の変更、アーキテクチャレベルの設計判断が必要
2. **Git操作**: ブランチ作成、コミット、プッシュ、PR作成
3. **技術決定の記録**: decision-assistant スキルを使用
4. **仕様書の作成・更新**: spec-assistant スキルを使用
5. **調査・分析タスク**: コードベースの調査、パフォーマンス分析

### 複合タスクの場合

複数のエージェントが必要な場合は、順次呼び出します：

**例: 新機能実装 + テスト + エラー修正**

1. **code-implementer** で機能を実装
2. **test-runner** でテストを実行・分析
3. 実装後に `npm run type-check` を実行
4. エラーがあれば **error-fixer** で修正

---

## スキル（Skills）

スキルは特定のタスク領域を自動化・支援するためのツールで、Skill ツールで呼び出されます。

### 利用可能なスキル一覧

| スキル | 説明 |
|--------|------|
| decision-assistant | 技術的意思決定を構造化して記録する。重要な設計判断、技術選定、アーキテクチャ決定を記録する際に使用する。 |
| spec-assistant | .context/specs/ に仕様書を作成・更新・検証する。実装変更時の同期チェックも行う。新機能の仕様策定、実装後の仕様書更新、仕様と実装の不整合検出に使用する。 |
| review-assistant | 変更コードの品質・セキュリティ・パフォーマンスをチェックする。PR作成前のセルフレビュー、デプロイ前確認、プライバシーチェックに使用する。 |
| git-workflow | プロジェクトのGit規則に従ってブランチ・コミット・PRを作成する。新機能開発、バグ修正、リファクタリングのワークフローで使用する。 |
| production-readiness | 本番環境への準備状況を包括的にチェックする。初回リリース前、大規模機能追加後、定期的な健全性チェックに使用する。 |

### スキル設計原則（Claude公式ベストプラクティス準拠）

本プロジェクトのスキルは、Claude公式の[Agent Skills Best Practices](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices)に基づいて設計されています：

- **段階的開示パターン**: SKILL.mdは機能索引として、必要な詳細ガイドのみを選択的に読み込む
- **簡潔なエントリーポイント**: SKILL.mdは500行以下、理想は100行前後
- **機能別分離**: 各機能（create, search, validate等）を独立したガイドで管理
- **コンテキスト効率**: 不要な情報を読み込まず、コンテキストウィンドウを効率的に使用

### 1. decision-assistant

- **説明**: 技術的意思決定を構造化して記録する
- **利用可能な機能**: 新規作成、検索、検証、分析
- **出力先**: `.context/decisions/YYYY-MM-DD-[topic].md`

### 2. spec-assistant

- **説明**: 仕様書を作成・更新・検証し、実装との同期をチェックする
- **利用可能な機能**: 機能仕様作成、API仕様作成、仕様書更新、仕様書検証、関連検索、同期チェック
- **出力先**:
  - 機能仕様: `.context/specs/features/[feature-name].md`
  - API仕様: `.context/specs/api/[feature-name]-api.md`

### 3. review-assistant

- **説明**: 変更コードの品質・セキュリティ・パフォーマンスをチェックする
- **利用可能な機能**: コード品質チェック、セキュリティチェック、パフォーマンスチェック、本番デプロイ前チェック、プライバシーチェック

### 4. git-workflow

- **説明**: プロジェクトのGit規則に従ってブランチ・コミット・PRを作成する
- **利用可能な機能**: ブランチ作成、コミット作成、PR作成

### 5. production-readiness

- **説明**: 本番環境への準備状況を包括的にチェックする
- **チェックカテゴリ**: セキュリティ、監視・ロギング、パフォーマンス、品質、運用

---

## カスタムスラッシュコマンド（Commands）

- **パス**: `.claude/commands/`
- **現状**: ディレクトリは存在するが、現在は未使用（空）
- **用途**: プロジェクト固有のカスタムコマンドを定義可能

---

## 設定ファイル（Settings）

### 1. settings.json（プロジェクト共有設定）

- **パス**: [.claude/settings.json](../../.claude/settings.json)
- **共有**: リポジトリにコミットされ、チーム全体で共有
- **内容**: 現在は空（`{}`）。プロジェクト共通のフックや設定を追加する場合に使用

### 2. settings.local.json（個人環境設定）

- **パス**: [.claude/settings.local.json](../.claude/settings.local.json)
- **共有**: `.gitignore`で除外され、個人環境のみで有効
- **内容**:
  - **権限設定（Permissions）**:
    - `allow`: 許可されたコマンド群
      - Git操作（add, rm, commit, log, checkout, push, pull, branch, remote）
      - 日付取得（JST）
      - npm/pnpm操作（install, uninstall, dev, build, test, lint, format）
      - TypeScript/Biome（tsc, biome check, biome format）
      - Convex（dev, deploy, env）
      - プロセス管理（netstat, ss, pkill, lsof, kill, killall）
      - ファイル操作（cat, grep, sed, awk, touch, mv, rm, mkdir, rmdir, chmod, find）
      - その他（openssl, tree, node, tsx, playwright, shadcn）
      - スキル呼び出し（decision-assistant, spec-assistant）
      - スクリプト実行（spec-assistant関連）
    - `deny`: 禁止されたコマンド群
      - システム管理（sudo、rm -rf）
      - 機密ファイル（.env, id_rsa, id_ed25519）
      - ネットワーク（curl, wget）
  - **フック（Hooks）**:
    - `Notification`: 通知表示（macOS osascript使用）
    - `Stop`: 作業完了時の通知音再生
  - **ステータスライン（Status Line）**:
    - `ccusage` パッケージによるトークン使用量表示

---

## ルート設定ファイル（CLAUDE.md）

### プロジェクト固有ルール（CLAUDE.md）

- **パス**: [CLAUDE.md](../CLAUDE.md)
- **目的**: プロジェクト全体で遵守すべきルールの定義
- **内容**:
  - **最重要**: `.context/` ディレクトリの参照を必須化
  - **言語**: 応答・コミットメッセージを日本語で記述
  - **TypeScript**: `any` 型の使用禁止、型安全性優先
  - **アーキテクチャ・設計判断**: `.context/decisions/` の決定記録を尊重
  - **仕様書の作成と同期**: 仕様書と実装の常時同期を義務化

### グローバル設定（~/.claude/CLAUDE.md）

- **パス**: `~/.claude/CLAUDE.md`（ユーザーホームディレクトリ）
- **スコープ**: 全プロジェクト共通
- **内容**:
  - 応答は必ず日本語で
  - sub agents を最大限活用
  - 値のハードコーディングを避ける
  - TypeScriptで `any` 型を使用禁止
  - 日時記載時はスクリプトで確認（`TZ='Asia/Tokyo' date '+%Y年%m月%d日 %H:%M:%S JST'`）

---

## 利用の流れ

1. **スキル呼び出し**: ユーザーが特定タスクを依頼
   - 例: 「通知機能の仕様書を作成して」→ `Skill(spec-assistant)`
   - 例: 「技術決定を記録して」→ `Skill(decision-assistant)`

2. **サブエージェント呼び出し**: 親エージェントが Task ツールで専門エージェントに委譲
   - 例: エラー修正が必要 → `Task(subagent_type=error-fixer)`
   - 例: 小規模実装が必要 → `Task(subagent_type=code-implementer)`
   - 例: テスト実行が必要 → `Task(subagent_type=test-runner)`

3. **権限チェック**: settings.local.json の allow/deny リストで実行可否を判定

4. **フック実行**: 特定イベント（Stop、Notification）発生時に自動実行（settings.local.json で定義）

5. **仕様書同期**: 実装変更後は `Skill(spec-assistant)` の同期チェック機能で整合性を確認

---

## 参考リンク

- **決定記録**: [.context/decisions/](./decisions/)
- **仕様書**: [.context/specs/](./specs/)
- **手順書**: [.context/runbook/](./runbook/)
- **プロジェクト情報**: [.context/project.md](./project.md)
- **アーキテクチャ**: [.context/architecture.md](./architecture.md)
- **コーディング規則**: [.context/coding-style.md](./coding-style.md)
- **エラーハンドリング**: [.context/error-handling.md](./error-handling.md)
- **テスト戦略**: [.context/testing-strategy.md](./testing-strategy.md)
