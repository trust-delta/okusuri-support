# 統合・レビューフェーズ (Integrate Phase)

実装結果を統合し、レビュー・PR作成まで完了するフェーズ。

## 前提条件

- 実装フェーズが完了していること
- すべてのテストがパスしていること

---

## 実行手順

### Step 1: 品質チェック

```bash
# 型チェック
npx tsc --noEmit

# Lint
npm run lint

# テスト
npm test
```

すべてパスすることを確認。

### Step 2: コミット作成

**git-workflow スキルを参照**:

```bash
# 変更をステージング
git add -A

# コミット（日本語、Conventional Commits形式）
git commit -m "$(cat <<'EOF'
feat: [機能名]を実装

[変更内容の説明]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

### Step 3: レビュー実行

**review-assistant スキルを使用**:

```
Skill(review-assistant)
```

レビュー項目:
- [ ] 型安全性
- [ ] セキュリティ
- [ ] アクセシビリティ
- [ ] パフォーマンス
- [ ] コーディング規約

### Step 4: 指摘事項の修正

レビューで見つかった問題を修正:

1. 修正を実施
2. 追加コミット
3. 再度テスト実行

### Step 5: PR 作成

**git-workflow スキルを参照**:

```bash
# ブランチをプッシュ
git push -u origin <branch-name>

# PR 作成
gh pr create --title "feat: [機能名]を実装" --body "$(cat <<'EOF'
## Summary
[変更内容の概要]

## Changes
- [変更点1]
- [変更点2]

## Test plan
- [ ] 型チェック通過
- [ ] Lint通過
- [ ] テスト通過
- [ ] レビュー完了

Closes #[issue番号]

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## 仕様書の同期確認

**spec-assistant スキルを使用**:

```
Skill(spec-assistant)
→ 「仕様書と実装の同期チェック」
```

実装と仕様書に差異があれば更新。

---

## チェックリスト

統合フェーズの完了条件:

### 品質
- [ ] 型チェック: `npx tsc --noEmit` パス
- [ ] Lint: `npm run lint` パス
- [ ] テスト: `npm test` パス

### レビュー
- [ ] review-assistant によるレビュー完了
- [ ] 指摘事項すべて対応済み

### Git
- [ ] コミット作成済み
- [ ] ブランチプッシュ済み
- [ ] PR 作成済み

### ドキュメント
- [ ] 仕様書と実装が同期

---

## PR マージ後の作業

ユーザーの指示に従い:

```bash
# PR をマージ
gh pr merge <pr-number> --squash --delete-branch

# ローカルを更新
git checkout develop
git pull origin develop

# イシューをクローズ（自動でない場合）
gh issue close <issue-number> --comment "PR #<pr-number> でマージされました。"
```

---

## トラブルシューティング

### PR作成時のエラー

| エラー | 対処 |
|--------|------|
| ブランチが古い | `git pull origin develop --rebase` |
| コンフリクト | 手動で解決後、再コミット |
| CI 失敗 | エラーログを確認し修正 |

### レビュー指摘が多い場合

1. 重大な問題から優先対応
2. 軽微な問題は別 PR で対応検討
3. ユーザーと相談

---

## 完了報告

すべて完了後、ユーザーに報告:

```markdown
## 実装完了レポート

### 概要
- **機能**: [機能名]
- **イシュー**: #[番号]
- **PR**: #[番号]

### 変更ファイル
- [ファイル一覧]

### テスト結果
- 型チェック: ✅
- Lint: ✅
- テスト: ✅ (XX/XX passed)

### レビュー結果
- [レビューの概要]

### 次のステップ
- [あれば記載]
```
