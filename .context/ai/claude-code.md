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

### 1. error-fixer

- **パス**: [.claude/agents/error-fixer.md](../.claude/agents/error-fixer.md)
- **役割**: エラー修正専門
- **対象**: 型エラー、Lintエラー、コンパイルエラー
- **利用ツール**: Read, Write, Edit, Glob, Grep, Bash, Skill
- **モデル**: sonnet
- **責任範囲**:
  - ✅ 型エラーの修正
  - ✅ Lintエラーの修正
  - ✅ コンパイルエラーの修正
  - ✅ 既存コードの型安全性向上
  - ❌ 新規機能の実装（code-implementerが担当）
  - ❌ 仕様書の作成・更新
  - ❌ Git操作

### 2. code-implementer

- **パス**: [.claude/agents/code-implementer.md](../.claude/agents/code-implementer.md)
- **役割**: コード実装専門
- **対象**: 小規模な実装（1-3ファイル程度）
- **利用ツール**: Read, Write, Edit, Glob, Grep, Bash, Skill
- **モデル**: sonnet
- **責任範囲**:
  - ✅ 新規機能の実装（小〜中規模）
  - ✅ 既存機能の拡張
  - ✅ リファクタリング
  - ❌ エラー修正のみ（error-fixerが担当）
  - ❌ 大規模な設計変更

---

## スキル（Skills）

スキルは特定のタスク領域を自動化・支援するためのツールで、Skill ツールで呼び出されます。

### スキル設計原則（Claude公式ベストプラクティス準拠）

本プロジェクトのスキルは、Claude公式の[Agent Skills Best Practices](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices)に基づいて設計されています：

- **段階的開示パターン**: SKILL.mdは機能索引として、必要な詳細ガイドのみを選択的に読み込む
- **簡潔なエントリーポイント**: SKILL.mdは500行以下、理想は100行前後
- **機能別分離**: 各機能（create, search, validate等）を独立したガイドで管理
- **コンテキスト効率**: 不要な情報を読み込まず、コンテキストウィンドウを効率的に使用

### 1. decision-assistant

- **パス**: [.claude/skills/decision-assistant/SKILL.md](../.claude/skills/decision-assistant/SKILL.md)
- **説明**: 技術的意思決定や重要な判断を構造化して記録
- **SKILL.md**: 87行（元716行から87%削減）
- **構造**:
  ```
  .claude/skills/decision-assistant/
  ├── SKILL.md              # 機能索引（87行）
  ├── capabilities/         # 機能別ガイド
  │   ├── create.md        # 新規作成（297行）
  │   ├── search.md        # 検索（137行）
  │   ├── validate.md      # 検証（230行）
  │   └── analyze.md       # 分析（261行）
  └── scripts/             # ユーティリティスクリプト
  ```
- **利用可能な機能**:
  1. **新規作成**: 技術的決定を構造化して記録（詳細: capabilities/create.md）
  2. **検索**: 既存決定を検索・参照（詳細: capabilities/search.md）
  3. **検証**: 決定記録の形式を検証（詳細: capabilities/validate.md）
  4. **分析**: 統計・履歴・競合を分析（詳細: capabilities/analyze.md）
- **出力先**: `.context/decisions/YYYY-MM-DD-[topic].md`
- **テンプレート**: `.context/decisions/templates/decision-template.md`
- **スクリプト**: get-date.sh、search-decisions.ts、find-related.ts、find-conflicts.ts、validate-decisions.ts、decision-stats.ts、decision-history.ts

### 2. spec-assistant

- **パス**: [.claude/skills/spec-assistant/SKILL.md](../.claude/skills/spec-assistant/SKILL.md)
- **説明**: 新機能の仕様書を対話形式で作成、または既存仕様書を実装に合わせて更新
- **SKILL.md**: 101行（元602行から90%削減）
- **構造**:
  ```
  .claude/skills/spec-assistant/
  ├── SKILL.md              # 機能索引（101行）
  ├── capabilities/         # 機能別ガイド
  │   ├── create-feature.md  # 機能仕様作成（246行）
  │   ├── create-api.md      # API仕様作成（291行）
  │   ├── update.md          # 仕様書更新（207行）
  │   ├── validate.md        # 仕様書検証（249行）
  │   └── search.md          # 関連検索（255行）
  └── scripts/             # ユーティリティスクリプト
  ```
- **利用可能な機能**:
  1. **機能仕様作成**: 新機能の仕様書を作成（詳細: capabilities/create-feature.md）
  2. **API仕様作成**: API仕様書を作成（詳細: capabilities/create-api.md）
  3. **仕様書更新**: 実装変更に合わせて更新（詳細: capabilities/update.md）
  4. **仕様書検証**: 形式や必須項目を検証（詳細: capabilities/validate.md）
  5. **関連検索**: 関連仕様書・実装を検索（詳細: capabilities/search.md）
- **出力先**:
  - 機能仕様: `.context/specs/features/[feature-name].md`
  - API仕様: `.context/specs/api/[feature-name]-api.md`
- **テンプレート**:
  - `.context/specs/templates/feature.template.md`（機能仕様）
  - `.context/specs/templates/api.template.md`（API仕様）
- **スクリプト**: spec-list-recent.sh、spec-list-templates.sh、spec-to-kebab-case.sh、spec-validate.sh、spec-search-related.sh、spec-find-impl.sh

---

## カスタムスラッシュコマンド（Commands）

- **パス**: `.claude/commands/`
- **現状**: ディレクトリは存在するが、現在は未使用（空）
- **用途**: プロジェクト固有のカスタムコマンドを定義可能

---

## 設定ファイル（Settings）

### 1. settings.json（プロジェクト共有設定）

- **パス**: [.claude/settings.json](../.claude/settings.json)
- **共有**: リポジトリにコミットされ、チーム全体で共有
- **内容**:
  - **フック（Hooks）**:
    - `Stop`: 作業完了時に仕様書との整合性確認を促すコマンドを実行

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
   - 例: 「型エラーを確認して」→ `Skill(type-check-lint)`

2. **サブエージェント呼び出し**: 親エージェントが Task ツールで専門エージェントに委譲
   - 例: エラー修正が必要 → `Task(subagent_type=error-fixer)`
   - 例: 小規模実装が必要 → `Task(subagent_type=code-implementer)`

3. **権限チェック**: settings.local.json の allow/deny リストで実行可否を判定

4. **フック実行**: 特定イベント（Stop、Notification）発生時に自動実行

5. **仕様書同期**: Stop時のフックで整合性確認を促す

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
