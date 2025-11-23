# CI/CD 設定

## 概要

本ドキュメントでは、GitHub Actions を使用した継続的インテグレーション（CI）と継続的デプロイメント（CD）の設定方法を説明します。

## CI/CD パイプライン概要

本プロジェクトでは、以下の CI/CD パイプラインを構築します：

### CI（継続的インテグレーション）

すべての Pull Request に対して実行：
1. 依存関係のインストール
2. 型チェック（`pnpm run lint`）
3. ビルド確認（`pnpm run build`）
4. Unit テスト（`pnpm run test`）
5. E2E テスト（`pnpm run test:e2e`）

### CD（継続的デプロイメント）

`main` ブランチへのマージ時に実行：
1. CI パイプラインの実行
2. Convex のデプロイ
3. Vercel のデプロイ（自動）

## GitHub Actions ワークフロー

### ワークフロー構成

以下の3つのワークフローを作成します：

1. **CI ワークフロー** (`.github/workflows/ci.yml`)
   - PR 作成時、コミットプッシュ時に実行
   - コードの品質チェック

2. **デプロイワークフロー** (`.github/workflows/deploy.yml`)
   - `main` ブランチへのマージ時に実行
   - Convex の自動デプロイ

3. **プレビューデプロイワークフロー** (`.github/workflows/preview.yml`)（オプション）
   - feature ブランチの PR 時に実行
   - Convex のプレビューデプロイメント作成

### ワークフローファイルの配置

```
.github/
└── workflows/
    ├── ci.yml           # CI パイプライン
    ├── deploy.yml       # 本番デプロイ
    └── preview.yml      # プレビューデプロイ（オプション）
```

## セットアップ手順

### 1. GitHub Secrets の設定

GitHub Actions で使用するシークレットを設定します。

#### 設定方法

1. GitHub リポジトリ → "Settings" → "Secrets and variables" → "Actions"
2. "New repository secret" をクリック
3. 以下のシークレットを追加

#### 必要なシークレット

| シークレット名 | 値 | 説明 |
|---------------|-----|------|
| `CONVEX_DEPLOY_KEY` | Convex デプロイキー | Convex のデプロイに使用 |

#### CONVEX_DEPLOY_KEY の取得方法

```bash
# Convex にログイン
npx convex login

# デプロイキーを生成
npx convex deploy --cmd "echo Deploy key generated"

# または Convex ダッシュボードから取得
# Settings → Deploy Keys → Create Deploy Key
```

Convex ダッシュボードからの取得手順：
1. [Convex Dashboard](https://dashboard.convex.dev/) にアクセス
2. プロジェクトを選択
3. "Settings" → "Deploy Keys"
4. "Create Deploy Key" をクリック
5. キーをコピーして GitHub Secrets に追加

### 2. Vercel との連携設定（自動）

Vercel は GitHub と自動的に連携するため、特別な設定は不要です。

- `main` ブランチへのプッシュ → 本番デプロイ
- PR の作成 → プレビューデプロイ

Vercel の設定は [deployment.md](./deployment.md) を参照してください。

### 3. ワークフローファイルの作成

GitHub Actions のワークフローファイルを作成します。詳細は「ワークフローファイルの詳細」セクションを参照してください。

## ワークフローファイルの詳細

### CI ワークフロー (`.github/workflows/ci.yml`)

**トリガー条件:**
- すべてのブランチへの `push`
- すべての Pull Request

**実行内容:**
- Node.js セットアップ
- pnpm インストール
- 依存関係のキャッシュ
- 型チェック
- ビルド
- テスト

### デプロイワークフロー (`.github/workflows/deploy.yml`)

**トリガー条件:**
- `main` ブランチへの `push`

**実行内容:**
- CI パイプラインの実行
- Convex へのデプロイ

**注意**: Vercel は自動的にデプロイされるため、ワークフローに含める必要はありません。

### プレビューデプロイワークフロー (`.github/workflows/preview.yml`)（オプション）

**トリガー条件:**
- `feature/*` ブランチへの Pull Request 作成時

**実行内容:**
- Convex のプレビューデプロイメント作成
- PR にコメントでプレビュー URL を投稿

## ワークフローの動作確認

### CI パイプラインのテスト

1. 新しいブランチを作成
```bash
git checkout -b test/ci-pipeline
```

2. 何か変更を加えてコミット
```bash
echo "# Test" >> test.md
git add test.md
git commit -m "test: CI パイプラインのテスト"
```

3. GitHub にプッシュ
```bash
git push origin test/ci-pipeline
```

4. GitHub Actions タブで実行状況を確認

### デプロイパイプラインのテスト

1. `develop` から `main` への PR を作成
2. CI が成功することを確認
3. PR をマージ
4. GitHub Actions タブで deploy ワークフローの実行を確認
5. Convex ダッシュボードで新しいデプロイメントを確認
6. Vercel ダッシュボードで新しいデプロイメントを確認

## ブランチプロテクション

`main` ブランチを保護して、CI が通過したコードのみマージできるようにします。

### 設定手順

1. GitHub リポジトリ → "Settings" → "Branches"
2. "Add branch protection rule" をクリック
3. Branch name pattern: `main`
4. 以下のオプションを有効化：
   - ✅ **Require a pull request before merging**
     - ✅ Require approvals: 1（個人開発の場合は不要）
   - ✅ **Require status checks to pass before merging**
     - ✅ Require branches to be up to date before merging
     - ✅ Status checks: `ci` を選択
   - ✅ **Require conversation resolution before merging**
   - ✅ **Do not allow bypassing the above settings**
5. "Create" をクリック

これにより、以下が強制されます：
- `main` への直接プッシュを禁止
- PR 経由でのみマージ可能
- CI パイプラインが成功しないとマージ不可

### develop ブランチの保護（オプション）

同様に `develop` ブランチも保護することを推奨します：

1. Branch name pattern: `develop`
2. 同じ設定を適用

## トラブルシューティング

### CI が失敗する

**症状**: GitHub Actions で CI が失敗する

**解決方法**:
1. ローカルで同じコマンドを実行して再現
```bash
pnpm run lint
pnpm run build
pnpm run test
```
2. エラーを修正してコミット
3. 再度プッシュ

### Convex デプロイが失敗する

**症状**: deploy ワークフローで Convex デプロイが失敗する

**解決方法**:
1. `CONVEX_DEPLOY_KEY` が正しく設定されているか確認
2. Convex デプロイキーが有効か確認
3. ローカルで手動デプロイを試す
```bash
npx convex deploy
```

### ワークフローが実行されない

**症状**: PR を作成してもワークフローが実行されない

**解決方法**:
1. `.github/workflows/` ディレクトリが正しく配置されているか確認
2. YAML ファイルの構文エラーを確認
3. GitHub Actions タブでエラーメッセージを確認

### キャッシュの問題

**症状**: 依存関係のキャッシュが古く、ビルドエラーが発生する

**解決方法**:
1. GitHub Actions → "Caches" タブ
2. 該当するキャッシュを削除
3. ワークフローを再実行

## パフォーマンス最適化

### キャッシュの活用

ワークフローで以下をキャッシュしてビルド時間を短縮：
- `node_modules`
- pnpm ストア
- Next.js ビルドキャッシュ

### 並列実行

複数のジョブを並列実行してパイプライン全体の時間を短縮：
```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    # ... 型チェック

  test:
    runs-on: ubuntu-latest
    # ... テスト

  build:
    runs-on: ubuntu-latest
    # ... ビルド
```

### 条件付き実行

変更されたファイルに応じてジョブをスキップ：
```yaml
- name: Check for changes
  uses: dorny/paths-filter@v2
  with:
    filters: |
      convex:
        - 'convex/**'
```

## セキュリティベストプラクティス

### シークレットの管理

- ✅ シークレットは GitHub Secrets で管理
- ✅ `.env` ファイルは Git にコミットしない
- ✅ ログにシークレットが出力されないようにする

### 権限の最小化

ワークフローには必要最小限の権限のみを付与：
```yaml
permissions:
  contents: read
  pull-requests: write
```

### サードパーティアクションの検証

信頼できるアクションのみ使用：
- 公式アクション（`actions/*`）
- Verified Creator のアクション
- コミュニティで広く使われているアクション

## モニタリング

### ワークフローの監視

- GitHub Actions タブで実行履歴を確認
- 失敗したワークフローの通知を設定
- 実行時間の推移を監視

### 通知設定

GitHub の通知設定でワークフローの失敗を通知：
1. GitHub Settings → Notifications
2. "Actions" → "Workflow run failures" を有効化

## 高度な設定

### マトリックス戦略

複数の Node.js バージョンでテスト：
```yaml
strategy:
  matrix:
    node-version: [20.x, 22.x]
```

### スケジュール実行

定期的に CI を実行（例: 夜間ビルド）：
```yaml
on:
  schedule:
    - cron: '0 0 * * *'  # 毎日 00:00 UTC
```

### 手動トリガー

手動でワークフローを実行可能にする：
```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'デプロイ先環境'
        required: true
        default: 'production'
```

## 次のステップ

CI/CD の設定が完了したら：

1. **実際のワークフローファイルを作成**
   - 本ドキュメントの設定を参考に `.github/workflows/` にファイルを配置

2. **ブランチプロテクションを設定**
   - `main` と `develop` ブランチを保護

3. **チームメンバーに共有**（該当する場合）
   - CI/CD の動作とワークフローを説明

4. **モニタリングの設定**
   - 失敗時の通知を設定
   - 定期的にワークフローの実行状況を確認

## 関連ドキュメント

- [開発ワークフロー](./development-workflow.md) - ブランチ戦略
- [デプロイ手順](./deployment.md) - 手動デプロイの手順

---

最終更新: 2025年10月29日
