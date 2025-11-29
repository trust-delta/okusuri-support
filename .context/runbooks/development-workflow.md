# 開発ワークフロー

## 概要

本プロジェクトでは、個人開発でありながら本番環境を見据えた安定性と、AI を活用した並行開発の柔軟性を両立するため、**ハイブリッド型の開発フロー**を採用します。

## ブランチ戦略

### ブランチ構成

```
main (本番・安定版)
  ↑
develop (日常開発・統合テスト)
  ↑
feature/* (大きな機能・実験的な機能のみ)
```

### 各ブランチの役割

- **main**: 本番環境にデプロイされる安定版。常にデプロイ可能な状態を維持。
- **develop**: 日常的な開発作業を行うブランチ。統合テストもここで実施。
- **feature/***: 大きな機能や実験的な機能を開発する際に使用。

## 開発フロー

### パターン1: develop で直接開発（推奨：小さな変更）

小さな変更や日常的な開発作業は、develop ブランチで直接行います。

**対象となる作業:**
- 小さなバグ修正
- UI の微調整
- 既存機能の小さな改善
- 複数の小さな変更をまとめて行う
- ドキュメント更新
- リファクタリング

**手順:**

```bash
# develop ブランチに切り替え
git checkout develop

# 最新の状態に更新
git pull origin develop

# 開発作業を実施
# ... コーディング ...

# 変更をコミット
git add .
git commit -m "fix: ボタンの配置を修正"

# リモートにプッシュ
git push origin develop
```

### パターン2: feature ブランチを使用（推奨：大きな機能）

大きな機能や実験的な開発は、feature ブランチを切って作業します。

**対象となる作業:**
- 大きな新機能の追加
- 破壊的な変更を伴う開発
- 実験的な機能（マージするか不明な場合）
- AI と並行開発したい機能
- レビュー・テストに時間がかかる機能

**手順:**

```bash
# develop ブランチから feature ブランチを作成
git checkout develop
git pull origin develop
git checkout -b feature/notification-system

# 開発作業を実施
# ... コーディング ...

# 変更をコミット
git add .
git commit -m "feat: 通知システムを実装"

# リモートにプッシュ
git push -u origin feature/notification-system

# GitHub で Pull Request を作成
# feature/notification-system → develop

# レビュー・テスト後、PR をマージ
# feature ブランチは削除
```

### パターン3: 本番リリース

develop での開発が完了し、本番環境にデプロイする準備ができたら、main にマージします。

**手順:**

```bash
# develop が最新であることを確認
git checkout develop
git pull origin develop

# テストを実行して問題がないことを確認
npm run type-check
npm run lint
npm run build
# 必要に応じて E2E テストなども実行

# GitHub で Pull Request を作成
# develop → main

# レビュー後、PR をマージ

# main から本番環境にデプロイ
git checkout main
git pull origin main
# デプロイコマンド実行（例: npx convex deploy など）
```

## AI を活用した並行開発

複数の機能を AI と並行開発する場合、以下のように進めます。

### 例: 2つの機能を並行開発

```bash
# 機能A の開発開始
git checkout develop
git checkout -b feature/feature-a
# AI と feature-a を開発...
git push -u origin feature/feature-a

# 機能B の開発開始（別のターミナル or セッション）
git checkout develop
git checkout -b feature/feature-b
# AI と feature-b を開発...
git push -u origin feature/feature-b

# それぞれ完成したら develop にマージ
# 1. feature/feature-a → develop
# 2. feature/feature-b → develop

# develop で統合テスト
git checkout develop
git pull origin develop
# 統合テストを実施...

# 問題なければ main にマージ
# develop → main
```

### メリット

- 各機能が独立して開発できる
- 片方で問題が発生しても、もう片方に影響しない
- develop で統合テストしてから本番に反映できる

## コミットメッセージ規約

Conventional Commits の形式に従います。

### フォーマット

```
<type>: <description>

[optional body]

[optional footer]
```

### Type の種類

- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメントのみの変更
- `style`: コードの意味に影響しない変更（フォーマット、セミコロンなど）
- `refactor`: リファクタリング
- `perf`: パフォーマンス改善
- `test`: テストの追加・修正
- `chore`: ビルドプロセスやツールの変更

### 例

```bash
git commit -m "feat: ユーザー通知機能を追加"
git commit -m "fix: ログインページのバリデーションエラーを修正"
git commit -m "docs: README に環境構築手順を追加"
```

## ブランチの命名規則

### feature ブランチ

```
feature/<機能名>
```

例:
- `feature/notification-system`
- `feature/user-profile`
- `feature/admin-dashboard`

### その他のブランチ（必要に応じて）

```
hotfix/<修正内容>   # 本番の緊急修正
bugfix/<バグ内容>   # develop のバグ修正
```

## Pre-commit Hook（自動実行）

コミット時に **husky + lint-staged** により以下が自動実行されます：

- ステージされたファイルに対して `biome check --write` が実行される
- フォーマット違反は自動修正
- lint エラーがある場合はコミットがブロックされる

そのため、**手動でのフォーマットやリント実行は不要** です。

## チェックリスト

### コミット前

- [x] フォーマット/Lint チェック → **自動実行（pre-commit hook）**
- [ ] ビルドが成功する (`pnpm run build`)（大きな変更時に推奨）
- [ ] 関連するテストが通る

### PR 作成前（feature → develop）

- [ ] develop の最新をマージ済み
- [ ] コンフリクトを解消済み
- [ ] 上記「コミット前」チェックをすべて実施
- [ ] 必要に応じて仕様書を更新

### リリース前（develop → main）

- [ ] develop で十分なテストを実施済み
- [ ] 本番環境での動作確認計画を準備
- [ ] 必要に応じてデータベースマイグレーション計画を準備
- [ ] ロールバック手順を確認

## トラブルシューティング

### develop と main が乖離した場合

```bash
# main の変更を develop に取り込む
git checkout develop
git merge main
git push origin develop
```

### feature ブランチが古くなった場合

```bash
# develop の最新を feature に取り込む
git checkout feature/your-feature
git merge develop
# コンフリクトがあれば解消
git push origin feature/your-feature
```

---

最終更新: 2025年11月30日
