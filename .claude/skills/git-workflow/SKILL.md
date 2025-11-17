---
name: git-workflow
description: Git操作を自動化するスキル。ブランチ作成、コミット、プッシュ、PR作成を効率化する。
allowed-tools: Bash, Read, Grep
---

# Git Workflow スキル

## 目的

Gitの日常的な操作（ブランチ作成、コミット、プッシュ、PR作成）を自動化し、開発ワークフローを効率化します。

## いつ使うか

以下のような場面で、このスキルを呼び出してください：

- **新機能開発開始**: 「feature/notification ブランチを作成して」
- **変更のコミット**: 「変更をコミットして」（メッセージは自動生成）
- **リモートへプッシュ**: 「変更をプッシュして」
- **PR作成**: 「PRを作成して」
- **一括実行**: 「ブランチ作成からPR作成まで一気にやって」

## スキルが行うこと

1. **ブランチ作成**
   - feature/fix/chore/refactorブランチを作成
   - developブランチから分岐
   - 既存ブランチの確認

2. **コミット**
   - 変更内容の確認（git status, git diff）
   - すべての変更をステージング（git add .）
   - コミット実行（日本語メッセージ対応）

3. **プッシュ**
   - 現在のブランチをリモートにプッシュ
   - 新規ブランチの場合は -u オプション付き

4. **PR作成**
   - GitHub CLI（gh）を使用してPR作成
   - タイトルと本文を自動生成（または手動指定）
   - ベースブランチ指定（デフォルト: develop）

5. **一括実行**
   - ブランチ作成 → コミット → プッシュ → PR作成を自動化

## 実行時の動作

### 1. ブランチ作成

```bash
./scripts/create-branch.sh <branch-type> <branch-name>
```

- スクリプト: [create-branch.sh](scripts/create-branch.sh)
- ブランチタイプ: `feature`, `fix`, `chore`, `refactor`
- developブランチから分岐（developが存在しない場合は現在のブランチから）

**例**:
```bash
./scripts/create-branch.sh feature notification
# → feature/notification ブランチを作成
```

### 2. コミット

```bash
./scripts/commit.sh "<commit-message>"
```

- スクリプト: [commit.sh](scripts/commit.sh)
- 変更内容を確認してステージング
- 日本語コミットメッセージ対応

**例**:
```bash
./scripts/commit.sh "feat: 通知機能を実装"
```

**コミットメッセージの自動生成**:
Claudeがgit statusとgit diffを解析して、適切なコミットメッセージを生成します。

### 3. プッシュ

```bash
./scripts/push.sh
```

- スクリプト: [push.sh](scripts/push.sh)
- 現在のブランチを自動検出
- リモート追跡ブランチがない場合は -u オプション付きでプッシュ

### 4. PR作成

```bash
./scripts/create-pr.sh "<PR-title>" "<PR-body>" [base-branch]
```

- スクリプト: [create-pr.sh](scripts/create-pr.sh)
- GitHub CLI（gh）が必要
- ベースブランチのデフォルトは `develop`

**例**:
```bash
./scripts/create-pr.sh \
  "feat: 通知機能を追加" \
  "## 概要\n通知機能を実装しました\n\n## 変更内容\n- プッシュ通知機能\n- 通知設定画面"
```

**PR本文の自動生成**:
Claudeがコミット履歴と変更内容を解析して、適切なPR本文を生成します。

### 5. 一括実行

```bash
./scripts/workflow-all.sh <branch-type> <branch-name> \
  "<commit-message>" "<PR-title>" "<PR-body>" [base-branch]
```

- スクリプト: [workflow-all.sh](scripts/workflow-all.sh)
- すべてのステップを順番に実行
- エラーが発生した場合は即座に停止

**例**:
```bash
./scripts/workflow-all.sh feature notification \
  "feat: 通知機能を実装" \
  "feat: 通知機能を追加" \
  "## 概要\n通知機能を実装しました"
```

## 使用可能なツール

- **Bash**: Git操作、GitHub CLI操作
- **Read**: コミット履歴、差分の読み込み
- **Grep**: 変更箇所の検索

## 前提条件

### 必須

- Git がインストールされていること
- リモートリポジトリが設定されていること

### PR作成に必要

- GitHub CLI（gh）がインストールされていること
- GitHub CLIが認証されていること（`gh auth login`）

インストール方法:
```bash
# macOS
brew install gh

# Linux
# https://cli.github.com/manual/installation
```

認証:
```bash
gh auth login
```

## 制限事項

### このスキルが行うこと
- ✅ ブランチ作成・切り替え
- ✅ 変更のステージング・コミット
- ✅ リモートへのプッシュ
- ✅ PRの作成
- ✅ コミットメッセージの自動生成支援
- ✅ PR本文の自動生成支援

### このスキルが行わないこと
- ❌ コードの実装（別のスキル・サブエージェントが担当）
- ❌ テストの実行（type-check-lintスキルが担当）
- ❌ マージ操作（手動またはGitHub UIで実施）
- ❌ コンフリクト解決（手動で実施）

## 実行例

### 例1: ブランチ作成のみ

```
ユーザー: 「通知機能のブランチを作成して」

git-workflow:
1. [ブランチタイプ確認] 「feature」を使用
2. [ブランチ名確認] 「notification」を使用
3. [実行] ./scripts/create-branch.sh feature notification
4. [結果] ✅ feature/notification ブランチを作成しました
```

### 例2: コミット（メッセージ自動生成）

```
ユーザー: 「変更をコミットして」

git-workflow:
1. [変更確認] git status, git diff を実行
2. [変更内容解析]
   - src/features/notification/components/NotificationList.tsx: 新規作成
   - convex/notifications/queries.ts: 新規作成
   - 通知一覧表示機能を実装
3. [メッセージ生成] 「feat: 通知一覧表示機能を実装」を提案
4. [ユーザー確認] このメッセージでコミットしますか？
5. [実行] ./scripts/commit.sh "feat: 通知一覧表示機能を実装"
6. [結果] ✅ コミットが完了しました
```

### 例3: プッシュからPR作成まで

```
ユーザー: 「プッシュしてPRを作成して」

git-workflow:
1. [プッシュ] ./scripts/push.sh
2. [結果] ✅ リモートブランチにプッシュしました
3. [PR本文生成]
   - コミット履歴を確認
   - 変更内容を要約
   - PR本文を生成
4. [PR作成] ./scripts/create-pr.sh "feat: 通知機能を追加" "..."
5. [結果] ✅ PRが作成されました
   🔗 URL: https://github.com/user/repo/pull/123
```

### 例4: 一括実行

```
ユーザー: 「通知機能を実装したので、ブランチ作成からPR作成まで全部やって」

git-workflow:
1. [ブランチ作成] feature/notification ブランチを作成
2. [コミット] 変更内容から自動生成したメッセージでコミット
3. [プッシュ] リモートにプッシュ
4. [PR作成] PR本文を自動生成してPR作成
5. [完了] ✨ すべてのステップが完了しました
```

---

## このスキルの位置づけ

このスキルは**Git操作の自動化**のためのスキルです。

- **feature-implementerサブエージェント**から実装完了後に呼び出される
- **手動実行**でも使用可能
- **他のスキルと連携**してワークフロー全体を自動化

### 他スキルとの連携

1. **spec-assistant** → 仕様書作成
2. **実装** → コード実装
3. **type-check-lint** → 品質チェック・自動修正
4. **git-workflow（このスキル）** → コミット・プッシュ・PR作成

---

## プロジェクト固有のルール（CLAUDE.md参照）

- コミットメッセージは日本語で記述すること
- ブランチ名はkebab-caseを使用すること
- developブランチから機能ブランチを作成すること
- PRのベースブランチはdevelopを使用すること

---

## このスキルの利点

✅ **Git操作の自動化**: ブランチ作成からPR作成までを自動化
✅ **コミットメッセージ生成**: 変更内容を解析して適切なメッセージを自動生成
✅ **PR本文生成**: コミット履歴から詳細なPR本文を自動生成
✅ **エラーチェック**: 各ステップでエラーを検出し、適切なメッセージを表示
✅ **柔軟性**: 個別実行も一括実行も可能
✅ **スクリプト再利用**: 他のツールやCIからも呼び出し可能
