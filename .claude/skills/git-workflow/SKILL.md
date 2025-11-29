---
name: git-workflow
description: Git操作の標準化を支援する。ブランチ命名規則、コミットメッセージ、PR作成のガイドラインを提供し、一貫性のあるワークフローを実現する。
---

# Git Workflow

Git操作の標準化とワークフロー管理を支援するスキル。

## 利用可能な機能

### 1. ブランチ作成
ブランチ命名規則に従ってブランチを作成します。

**使用例**:
- 「新機能用のブランチを作成」
- 「バグ修正のブランチを作って」

**詳細**: [capabilities/branch.md](capabilities/branch.md)

---

### 2. コミット作成
コミットメッセージ規則に従ってコミットを作成します。

**使用例**:
- 「変更をコミットして」
- 「この機能をコミット」

**詳細**: [capabilities/commit.md](capabilities/commit.md)

---

### 3. PR作成
PRテンプレートに従ってPull Requestを作成します。

**使用例**:
- 「PRを作成して」
- 「この機能のPRを出したい」

**詳細**: [capabilities/pull-request.md](capabilities/pull-request.md)

---

## ブランチ命名規則

### フォーマット
```
<type>/<description>
```

### タイプ一覧

| タイプ | 用途 | 例 |
|--------|------|-----|
| `feature` | 新機能 | `feature/medication-reminder` |
| `fix` | バグ修正 | `fix/login-error` |
| `refactor` | リファクタリング | `refactor/auth-logic` |
| `docs` | ドキュメント | `docs/api-specification` |
| `test` | テスト | `test/e2e-medication` |
| `chore` | 雑務 | `chore/update-dependencies` |

### 命名ルール
- 英数字とハイフンのみ使用
- すべて小文字
- 簡潔で説明的な名前
- 日本語は使用しない

---

## コミットメッセージ規則

### フォーマット
```
<type>: <subject>

[body]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### タイプ一覧

| タイプ | 用途 |
|--------|------|
| `feat` | 新機能 |
| `fix` | バグ修正 |
| `refactor` | リファクタリング |
| `docs` | ドキュメント |
| `test` | テスト |
| `chore` | 雑務 |
| `style` | フォーマット |
| `perf` | パフォーマンス改善 |

### ルール
- **日本語で記述**（このプロジェクトの規則）
- 件名は50文字以内
- 件名は「何をしたか」を簡潔に
- 本文は「なぜそうしたか」を説明
- 命令形を使用（「追加する」ではなく「追加」）

### 例
```
feat: 処方箋の複製機能を追加

既存の処方箋をコピーして新しい処方箋を作成できるようにした。
これにより、似た処方箋を効率的に登録できる。

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## PR テンプレート

### フォーマット
```markdown
## Summary
<変更内容の概要を1-3行で>

## Changes
- <変更点1>
- <変更点2>
- <変更点3>

## Test plan
- [ ] <テスト項目1>
- [ ] <テスト項目2>

## Related
- Issue: #<issue番号>（該当する場合）
- 仕様書: `.context/specs/features/<name>.md`（該当する場合）

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

---

## ワークフロー

### 新機能開発
```bash
# 1. mainから最新を取得
git checkout main
git pull origin main

# 2. 機能ブランチを作成
git checkout -b feature/<feature-name>

# 3. 開発・コミット
git add .
git commit -m "feat: <説明>"

# 4. プッシュ・PR作成
git push -u origin feature/<feature-name>
gh pr create --title "feat: <説明>" --body "..."
```

### バグ修正
```bash
# 1. mainから最新を取得
git checkout main
git pull origin main

# 2. 修正ブランチを作成
git checkout -b fix/<bug-description>

# 3. 修正・コミット
git add .
git commit -m "fix: <説明>"

# 4. プッシュ・PR作成
git push -u origin fix/<bug-description>
gh pr create --title "fix: <説明>" --body "..."
```

---

## 注意事項

1. **mainへの直接コミット禁止**: 必ずブランチを作成
2. **コミット前の確認**: `npm run type-check && npm run lint`
3. **PR前の確認**: テストが通ることを確認
4. **マージ後の削除**: マージ後はブランチを削除

---

**最終更新**: 2025年11月29日
