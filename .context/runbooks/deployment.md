# デプロイ手順

## 概要

本ドキュメントでは、おくすりサポートアプリケーションを本番環境にデプロイする手順を説明します。

このプロジェクトは以下の2つのコンポーネントで構成されています：
- **フロントエンド**: Next.js アプリケーション（Vercel にデプロイ）
- **バックエンド**: Convex（Convex クラウドにデプロイ）

## 前提条件

デプロイを行う前に、以下が完了していることを確認してください：

- [ ] GitHub リポジトリに main ブランチがプッシュされている
- [ ] develop ブランチでの開発とテストが完了している
- [ ] すべてのテスト（型チェック、Lint、ビルド）が通過している
- [ ] Vercel アカウントを作成済み
- [ ] Convex アカウントを作成済み

## デプロイアーキテクチャ

```
GitHub Repository (main branch)
  ↓
  ├─ Vercel (Next.js Frontend)
  │   └─ 環境変数: CONVEX_DEPLOYMENT, NEXT_PUBLIC_CONVEX_URL
  └─ Convex (Backend)
      └─ 環境変数: AUTH_SECRET など
```

## 初回デプロイ手順

### 1. Convex のデプロイ

#### 1-1. Convex プロジェクトの作成

```bash
# main ブランチに切り替え
git checkout main
git pull origin main

# Convex にログイン
npx convex login

# 本番用デプロイメントを作成
npx convex deploy
```

初回実行時：
1. ブラウザが開き、Convex ダッシュボードにアクセスします
2. 新しいプロジェクトを作成するか、既存のプロジェクトを選択します
3. プロジェクト名を入力（例: `okusuri-support-production`）
4. デプロイメントが作成され、URL が生成されます

#### 1-2. Convex 環境変数の設定

```bash
# 本番環境の環境変数を設定
npx convex env set AUTH_SECRET <your-production-auth-secret>

# 環境変数の確認
npx convex env list
```

**重要**: 本番環境の `AUTH_SECRET` は開発環境とは別の値を使用してください。

```bash
# 本番用の AUTH_SECRET を生成
openssl rand -base64 32
```

#### 1-3. Convex URL の取得

デプロイ後、以下のコマンドで Convex の URL を確認できます：

```bash
npx convex env list
```

出力例：
```
CONVEX_DEPLOYMENT: https://your-project.convex.cloud
NEXT_PUBLIC_CONVEX_URL: https://your-project.convex.site
```

これらの URL を控えておきます（Vercel の設定で使用します）。

### 2. Vercel へのデプロイ

#### 2-1. Vercel プロジェクトの作成

1. [Vercel ダッシュボード](https://vercel.com/dashboard) にアクセス
2. "Add New..." → "Project" をクリック
3. GitHub リポジトリを連携
4. `trust-delta/okusuri-support` を選択
5. プロジェクト設定：
   - **Framework Preset**: Next.js
   - **Root Directory**: `./`（デフォルト）
   - **Build Command**: `pnpm run build`（自動検出）
   - **Output Directory**: `.next`（自動検出）
   - **Install Command**: `pnpm install`（自動検出）

#### 2-2. 環境変数の設定

Vercel のプロジェクト設定で以下の環境変数を追加：

| 変数名 | 値 | 説明 |
|--------|-----|------|
| `CONVEX_DEPLOYMENT` | `https://your-project.convex.cloud` | Convex デプロイメント URL |
| `NEXT_PUBLIC_CONVEX_URL` | `https://your-project.convex.site` | Convex パブリック URL |
| `AUTH_SECRET` | `<production-auth-secret>` | 認証シークレット（本番用） |

**設定手順:**
1. Vercel プロジェクト → "Settings" → "Environment Variables"
2. 各環境変数を追加
3. Environment: "Production" を選択

#### 2-3. ブランチ設定

Vercel のデプロイ設定を確認：

1. "Settings" → "Git" に移動
2. **Production Branch**: `main` を設定
3. **Preview Branches**: すべてのブランチを有効化（オプション）

これにより：
- `main` ブランチへのプッシュで本番デプロイ
- その他のブランチへのプッシュでプレビューデプロイ

#### 2-4. デプロイの実行

"Deploy" ボタンをクリックするか、main ブランチにプッシュしてデプロイを開始します。

```bash
# ローカルから main にプッシュ
git checkout main
git push origin main
```

デプロイが完了すると、Vercel から本番 URL が提供されます（例: `https://okusuri-support.vercel.app`）。

### 3. デプロイの確認

#### 3-1. アプリケーションの動作確認

1. Vercel の本番 URL にアクセス
2. 以下の動作を確認：
   - [ ] ページが正常に表示される
   - [ ] 認証（GitHub OAuth）が機能する
   - [ ] Convex との通信が正常（データの取得・保存）
   - [ ] すべての主要機能が動作する

#### 3-2. ログの確認

**Vercel のログ:**
- Vercel ダッシュボード → プロジェクト → "Logs" タブ

**Convex のログ:**
- Convex ダッシュボード → プロジェクト → "Logs" タブ

## 継続的なデプロイ

初回デプロイ後、以下の自動デプロイフローが確立されます。

### 通常のリリースフロー

```bash
# 1. develop で開発・テスト
git checkout develop
# ... 開発作業 ...
git push origin develop

# 2. develop を main にマージ（PR 経由）
# GitHub で PR を作成: develop → main
# レビュー・承認後、マージ

# 3. 自動デプロイ
# main へのマージにより、Vercel が自動的にデプロイを開始
```

### Convex のデプロイ

Convex のコード（`convex/` ディレクトリ）を更新した場合：

```bash
# main ブランチから Convex をデプロイ
git checkout main
git pull origin main
npx convex deploy
```

**注意**: 現在、Convex のデプロイは手動です。CI/CD で自動化する場合は [ci-cd-setup.md](./ci-cd-setup.md) を参照してください。

## プレビューデプロイ（オプション）

feature ブランチや develop ブランチの変更を本番環境にマージする前にプレビューできます。

```bash
# feature ブランチをプッシュ
git checkout feature/new-feature
git push origin feature/new-feature
```

Vercel が自動的にプレビュー環境を作成し、PR にプレビュー URL を投稿します。

### プレビュー環境の注意点

- プレビュー環境も本番の Convex を使用します
- テストデータの混入に注意
- 必要に応じて開発用の Convex デプロイメントを使用

## 環境変数の更新

本番環境の環境変数を更新する必要がある場合：

### Vercel の環境変数

1. Vercel ダッシュボード → プロジェクト → "Settings" → "Environment Variables"
2. 変数を更新
3. "Redeploy" をクリックして再デプロイ

### Convex の環境変数

```bash
# 環境変数を更新
npx convex env set KEY new-value

# Convex を再デプロイ
npx convex deploy
```

## ロールバック

問題が発生した場合、前のバージョンにロールバックできます。

### Vercel のロールバック

1. Vercel ダッシュボード → プロジェクト → "Deployments"
2. 以前の正常なデプロイメントを探す
3. "..." メニュー → "Promote to Production"

### Git のロールバック

```bash
# 前のコミットに戻す
git checkout main
git revert <commit-hash>
git push origin main

# または特定のコミットまで巻き戻す（注意: 履歴を書き換えます）
git reset --hard <commit-hash>
git push --force origin main
```

**警告**: `git push --force` は履歴を書き換えるため、チームで開発している場合は注意が必要です。

### Convex のロールバック

Convex はバージョン管理をサポートしています：

1. Convex ダッシュボード → プロジェクト → "Deployments"
2. 以前のデプロイメントを選択
3. "Restore" をクリック

## トラブルシューティング

### ビルドエラー

**症状**: Vercel でビルドが失敗する

**解決方法**:
1. ローカルで `pnpm run build` を実行して確認
2. 型エラーや Lint エラーを修正
3. `node_modules` と `.next` を削除して再ビルド

### 環境変数エラー

**症状**: アプリが起動するが、Convex に接続できない

**解決方法**:
1. Vercel の環境変数が正しく設定されているか確認
2. `NEXT_PUBLIC_CONVEX_URL` が正しいか確認
3. Convex の環境変数が設定されているか確認

### 認証エラー

**症状**: GitHub OAuth ログインが失敗する

**解決方法**:
1. GitHub OAuth アプリの設定を確認
2. Callback URL が正しいか確認（`https://your-app.vercel.app/api/auth/callback/github`）
3. `AUTH_SECRET` が設定されているか確認

### Convex デプロイエラー

**症状**: `npx convex deploy` が失敗する

**解決方法**:
```bash
# Convex にログインし直す
npx convex logout
npx convex login

# 再度デプロイ
npx convex deploy
```

## セキュリティ考慮事項

### 環境変数の管理

- ✅ `AUTH_SECRET` は本番環境と開発環境で異なる値を使用
- ✅ 環境変数は Git にコミットしない（`.env.local` は `.gitignore` に含まれている）
- ✅ 定期的にシークレットをローテーション

### GitHub OAuth

- ✅ 本番環境用の GitHub OAuth アプリを別途作成
- ✅ Callback URL を本番 URL に限定

### CORS 設定

- ✅ Convex の CORS 設定を本番 URL に限定（開発時は `localhost` も許可）

## パフォーマンス最適化

### Vercel の設定

- Edge Functions の活用（必要に応じて）
- ISR（Incremental Static Regeneration）の設定
- 画像最適化の設定

### Convex の最適化

- クエリのインデックス設定
- 不要なデータの取得を避ける
- ページネーションの実装

## モニタリング

### Vercel Analytics

Vercel Analytics を有効化してアクセス状況を監視：

1. Vercel ダッシュボード → プロジェクト → "Analytics"
2. "Enable Analytics" をクリック

### エラー監視

エラー監視サービスの導入を検討：
- Sentry
- LogRocket
- Datadog

## 次のステップ

デプロイが完了したら、以下のドキュメントを参照してください：

- [CI/CD 設定](./ci-cd-setup.md) - 自動デプロイの設定
- [開発ワークフロー](./development-workflow.md) - 継続的な開発フロー

---

最終更新: 2025年10月29日
