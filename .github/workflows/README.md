# GitHub Actions ワークフロー

このディレクトリには、プロジェクトの CI/CD パイプラインを実装する GitHub Actions ワークフローファイルが含まれています。

## ワークフロー一覧

### 1. CI (`ci.yml`)

**トリガー:**
- すべてのブランチへの `push`
- `main`, `develop` への Pull Request

**実行内容:**
- 型チェック・Lint (`pnpm run lint`)
- ビルド (`pnpm run build`)
- Unit テスト (`pnpm run test`)

**目的:**
コードの品質を保証し、マージ前にエラーを検出します。

---

### 2. Deploy to Production (`deploy.yml`)

**トリガー:**
- `main` ブランチへの `push`

**実行内容:**
1. CI チェックの実行
2. Convex への自動デプロイ

**目的:**
本番環境への継続的デプロイを実現します。Vercel は自動的にデプロイされます。

---

### 3. Preview Deployment (`preview.yml`)

**トリガー:**
- `develop` への Pull Request 作成・更新時

**実行内容:**
- PR にプレビューデプロイの情報をコメント

**目的:**
プレビュー環境についての情報を PR に提供します。

---

## セットアップ

これらのワークフローを使用するには、以下のシークレットを設定する必要があります：

### GitHub Secrets

| シークレット名 | 説明 | 取得方法 |
|---------------|------|----------|
| `CONVEX_DEPLOY_KEY` | Convex デプロイキー | Convex ダッシュボード → Settings → Deploy Keys |

詳細なセットアップ手順は [.context/runbooks/ci-cd-setup.md](../../.context/runbooks/ci-cd-setup.md) を参照してください。

---

## ブランチプロテクション

以下のブランチプロテクションルールの設定を推奨します：

### `main` ブランチ

- ✅ Require a pull request before merging
- ✅ Require status checks to pass before merging
  - Status check: `ci`
- ✅ Require conversation resolution before merging

### `develop` ブランチ

- ✅ Require status checks to pass before merging
  - Status check: `ci`

---

## トラブルシューティング

### ワークフローが実行されない

- `.github/workflows/` ディレクトリが正しく配置されているか確認
- YAML ファイルに構文エラーがないか確認
- GitHub Actions タブでエラーメッセージを確認

### Convex デプロイが失敗する

- `CONVEX_DEPLOY_KEY` が正しく設定されているか確認
- Convex デプロイキーが有効か確認
- ローカルで `npx convex deploy` を実行して問題を特定

### CI が失敗する

- ローカルで同じコマンドを実行して再現
  ```bash
  pnpm run lint
  pnpm run build
  pnpm run test
  ```
- エラーを修正してコミット・プッシュ

---

## カスタマイズ

### テストの追加

E2E テストを CI に追加する場合は、`ci.yml` に以下のステップを追加：

```yaml
- name: Playwright をインストール
  run: pnpm exec playwright install --with-deps

- name: E2E テストを実行
  run: pnpm run test:e2e
```

### 通知の追加

Slack や Discord への通知を追加する場合は、各ワークフローに通知ステップを追加してください。

---

## 関連ドキュメント

- [CI/CD セットアップ](../../.context/runbooks/ci-cd-setup.md) - 詳細なセットアップ手順
- [デプロイ手順](../../.context/runbooks/deployment.md) - 手動デプロイの手順
- [開発ワークフロー](../../.context/runbooks/development-workflow.md) - ブランチ戦略
