# フィーチャーブランチ作業完全ガイド

## 概要

このガイドでは、フィーチャーブランチを使った開発作業の完全な流れを、実際の例（処方箋作成フォームのUI改善）を交えて説明します。

## 対象読者

- フィーチャーブランチでの開発を行う開発者
- Claude Code を使って開発を進める開発者
- Git とGitHub のワークフローを学びたい開発者

## 前提条件

- Git がインストールされていること
- GitHub CLI (`gh`) がインストールされ、認証済みであること
- リポジトリのクローンが完了していること
- develop ブランチにいること

## ワークフローの全体像

```
1. ブランチ作成
   ↓
2. 実装・テスト
   ↓
3. Lint/フォーマット修正
   ↓
4. コミット
   ↓
5. プッシュ & PR作成
   ↓
6. CI確認・修正
   ↓
7. レビュー・マージ
   ↓
8. ブランチ削除・develop更新
```

---

## ステップ1: ブランチ作成

### 1-1. develop ブランチの最新化

まず、develop ブランチが最新であることを確認します。

```bash
# develop ブランチに切り替え
git checkout develop

# 最新の状態に更新
git pull origin develop
```

### 1-2. フィーチャーブランチの作成

適切な命名規則に従ってブランチを作成します。

**命名規則:**
```
feature/<機能の説明>
fix/<修正内容>
docs/<ドキュメント内容>
chore/<雑務内容>
```

**例:**
```bash
# 機能追加の場合
git checkout -b feature/prescription-form-ui-improvements

# バグ修正の場合
git checkout -b fix/login-validation-error

# ドキュメント追加の場合
git checkout -b docs/api-documentation
```

---

## ステップ2: 実装・テスト

### 2-1. .context/ ディレクトリの確認

実装前に必ず関連ドキュメントを確認します。

```bash
# 仕様書を確認
ls .context/specs/

# ADRを確認
ls .context/decisions/

# 既存のrunbookを確認
ls .context/runbooks/
```

### 2-2. 実装作業

コーディング規約とプロジェクトのルールに従って実装します。

**重要なポイント:**
- TypeScript では `any` 型を使用しない
- 可能な限り値のハードコーディングを避ける
- コンポーネントは適切に分割する

### 2-3. ローカルでのテスト

変更が正しく動作することを確認します。

```bash
# 開発サーバーを起動
npm run dev

# ブラウザでテスト
# http://localhost:3000
```

---

## ステップ3: Lint/フォーマット/型チェック

### 3-1. フォーマットの適用

```bash
npm run format
```

### 3-2. Lint チェックと自動修正

```bash
# Lintチェック
npm run lint

# 自動修正（safe fixes）
npx biome check --write

# 自動修正（unsafe fixes も含む）
npx biome check --write --unsafe
```

### 3-3. ビルドテスト

```bash
npm run build
```

**エラーが出た場合:**
- 型エラー: TypeScript の型定義を確認
- Lint エラー: 手動で修正が必要な場合がある
- ビルドエラー: インポートパスやコンポーネントの構文を確認

---

## ステップ4: コミット

### 4-1. 変更内容の確認

```bash
# 変更されたファイルを確認
git status

# 差分を確認
git diff
```

### 4-2. ステージングとコミット

```bash
# 変更をステージング
git add <ファイル名>

# または全ての変更をステージング
git add -A

# コミット
git commit -m "feat: 処方箋作成フォームのUI改善

- 「薬を追加」ボタンを下部に配置
- 登録時の確認ダイアログを追加

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

**コミットメッセージの規約:**
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント
- `chore`: 雑務
- `refactor`: リファクタリング

---

## ステップ5: プッシュ & PR作成

### 5-1. リモートへプッシュ

**初回プッシュ:**
```bash
git push -u origin feature/prescription-form-ui-improvements
```

**2回目以降:**
```bash
git push
```

### 5-2. Pull Request の作成

GitHub CLI を使ってPRを作成します。

```bash
gh pr create --title "feat: 処方箋作成フォームのUI改善" --body "$(cat <<'EOF'
## 概要
処方箋作成フォームのユーザビリティを改善しました。

## 変更内容

### 1. 「薬を追加」ボタンの配置変更
- 上部の「薬リスト」見出し横から下部に移動
- キャンセル・登録ボタンと同じ行に配置

### 2. 登録時の確認ダイアログ
- 登録ボタンクリック時に確認ダイアログを表示
- 誤操作を防止

### 3. 仕様書の更新
- `.context/specs/features/medication.md` を更新

## テスト計画
- [ ] 処方箋作成フォームで「薬を追加」ボタンが下部に表示されることを確認
- [ ] 登録ボタンクリック時に確認ダイアログが表示されることを確認
- [ ] 確認ダイアログで「登録する」を選択すると正常に登録されることを確認

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## ステップ6: CI確認・修正

### 6-1. CI の実行確認

PRを作成すると自動的にCIが実行されます。

**確認するCI項目:**
- 型チェック
- Lint
- ビルド
- テスト

### 6-2. CI エラーの対処

#### Lint エラーの場合

```bash
# 既存の lint エラーを修正
npm run format
npx biome check --write
npx biome check --write --unsafe

# 手動修正が必要な場合は該当ファイルを編集

# 再度確認
npm run lint
npm run build

# コミット & プッシュ
git add -A
git commit -m "chore: lintエラーを修正"
git push
```

#### GitHub Actions 権限エラーの場合

`.github/workflows/ci.yml` に権限を追加:

```yaml
jobs:
  ci:
    name: 型チェック・ビルド・テスト
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
      issues: write
```

---

## ステップ7: レビュー・マージ

### 7-1. セルフレビュー

PRを作成したら、自分でコードレビューを行います。

**チェック項目:**
- [ ] 全てのCIが成功している
- [ ] コードが読みやすく、理解しやすい
- [ ] 不要なコメントアウトがない
- [ ] console.log などのデバッグコードが残っていない
- [ ] 仕様書が更新されている（必要な場合）

### 7-2. マージ

GitHubのUIまたはCLIでマージします。

```bash
# CLI でマージ
gh pr merge <PR番号> --squash
```

**マージ方法:**
- **Squash and merge（推奨）**: 複数のコミットを1つにまとめる
- **Merge commit**: コミット履歴をそのまま残す
- **Rebase and merge**: コミット履歴を線形にする

---

## ステップ8: ブランチ削除・develop更新

### 8-1. develop ブランチに戻る

```bash
git checkout develop
```

### 8-2. 最新の状態に更新

```bash
git pull origin develop
```

### 8-3. ローカルブランチの削除

```bash
# マージ済みのブランチを削除
git branch -d feature/prescription-form-ui-improvements
```

### 8-4. リモートブランチの削除

```bash
git push origin --delete feature/prescription-form-ui-improvements
```

または、GitHub の PR ページで「Delete branch」ボタンをクリック。

---

## トラブルシューティング

### コンフリクトが発生した場合

```bash
# develop の最新を取り込む
git checkout feature/your-feature
git merge develop

# コンフリクトを手動で解決
# エディタで該当ファイルを編集

# 解決後
git add <解決したファイル>
git commit -m "chore: develop をマージしてコンフリクトを解決"
git push
```

### 誤ってコミットした場合

```bash
# 直前のコミットを取り消す（変更は残る）
git reset --soft HEAD~1

# 変更も含めて取り消す
git reset --hard HEAD~1
```

### ブランチ名を間違えた場合

```bash
# ブランチ名を変更
git branch -m <古い名前> <新しい名前>

# リモートを更新
git push origin -u <新しい名前>
git push origin --delete <古い名前>
```

---

## ベストプラクティス

### 1. 小さく分割する

1つのPRには1つの機能または修正を含めます。

**良い例:**
- `feat: ログインフォームにバリデーションを追加`
- `fix: ユーザー一覧のページネーションを修正`

**悪い例:**
- `feat: ログイン機能とユーザー管理画面とダッシュボードを実装`

### 2. こまめにコミット

作業の区切りでこまめにコミットします。

**例:**
```bash
git commit -m "feat: 確認ダイアログのコンポーネントを作成"
git commit -m "feat: フォームに確認ダイアログを統合"
git commit -m "docs: 仕様書を更新"
```

### 3. コミットメッセージは明確に

何をしたかではなく、**なぜそうしたか**を書きます。

**良い例:**
```
feat: 登録時に確認ダイアログを追加

処方箋は作成後に編集できないため、
ユーザーが誤って登録することを防ぐために確認ダイアログを追加しました。
```

**悪い例:**
```
feat: ダイアログを追加
```

### 4. PR説明は詳細に

レビュアー（または未来の自分）が理解しやすいように詳細を書きます。

**含めるべき内容:**
- 変更の概要
- 変更理由
- テスト方法
- スクリーンショット（UI変更の場合）
- 関連Issue

---

## チェックリスト

### ブランチ作成時
- [ ] develop ブランチから作成している
- [ ] ブランチ名が命名規則に従っている

### 実装時
- [ ] 関連する `.context/` ドキュメントを確認した
- [ ] TypeScript の型定義が適切
- [ ] `any` 型を使用していない

### コミット前
- [ ] `npm run format` を実行した
- [ ] `npm run lint` でエラーがない
- [ ] `npm run build` が成功する
- [ ] ローカルで動作確認した

### PR作成前
- [ ] コミットメッセージが明確
- [ ] 不要なファイルがコミットされていない
- [ ] 仕様書を更新した（必要な場合）

### マージ前
- [ ] 全てのCIが成功している
- [ ] セルフレビューを実施した
- [ ] テスト計画を実施した

### マージ後
- [ ] develop ブランチを最新化した
- [ ] ローカルブランチを削除した
- [ ] リモートブランチを削除した

---

## 参考資料

- [開発ワークフロー](./development-workflow.md)
- [CI/CD セットアップ](./ci-cd-setup.md)
- [開発環境セットアップ](./setup-development-environment.md)

---

**最終更新**: 2025年11月12日
