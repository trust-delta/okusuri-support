# 開発環境セットアップ手順

## 概要

本ドキュメントでは、おくすりサポートプロジェクトの開発環境をゼロから構築する手順を説明します。

## 前提条件

開発に必要なツールがインストールされていることを確認してください。

### 必須ツール

- **Git**: バージョン管理
- **Node.js**: v22.20.0 以上（推奨: v22.20.0）
- **pnpm**: パッケージマネージャー
- **任意のエディタ**: VS Code 推奨

## セットアップ手順

### 1. Node.js のインストール

#### 推奨: Volta を使用する場合

```bash
# Volta のインストール（未インストールの場合）
curl https://get.volta.sh | bash

# Node.js v22.20.0 をインストール
volta install node@22.20.0
```

#### 推奨: asdf を使用する場合

```bash
# asdf のインストール（未インストールの場合）
# https://asdf-vm.com/guide/getting-started.html

# Node.js プラグインを追加
asdf plugin add nodejs

# プロジェクトで指定されたバージョンをインストール
asdf install nodejs 22.20.0

# グローバルに設定（オプション）
asdf global nodejs 22.20.0
```

#### その他の方法

- [公式サイト](https://nodejs.org/) からダウンロード
- nvm を使用: `nvm install 22.20.0 && nvm use 22.20.0`

#### バージョン確認

```bash
node --version
# v22.20.0 が表示されることを確認
```

### 2. pnpm のインストール

```bash
# npm 経由でインストール
npm install -g pnpm

# バージョン確認
pnpm --version
```

### 3. リポジトリのクローン

```bash
# HTTPS の場合
git clone https://github.com/trust-delta/okusuri-support.git

# SSH の場合
git clone git@github.com:trust-delta/okusuri-support.git

# プロジェクトディレクトリに移動
cd okusuri-support
```

### 4. ブランチの確認

```bash
# develop ブランチに切り替え（開発はこのブランチで行う）
git checkout develop

# ブランチの確認
git branch
# * develop が表示されることを確認
```

### 5. 依存関係のインストール

```bash
pnpm install
```

このコマンドで `package.json` に記載されたすべての依存パッケージがインストールされます。

また、`prepare` スクリプトにより **husky（Git hooks）** が自動的にセットアップされます。これにより、コミット時に自動でフォーマットとリントが実行されるようになります。

### 6. 環境変数の設定

`.env.local` ファイルを作成し、必要な環境変数を設定します。

```bash
# .env.local.example がある場合はコピー
# ない場合は新規作成
touch .env.local
```

`.env.local` に以下の環境変数を設定してください：

```env
# Convex
CONVEX_DEPLOYMENT=<your-convex-deployment-url>
NEXT_PUBLIC_CONVEX_URL=<your-convex-url>

# 認証関連（Convex Auth）
AUTH_SECRET=<your-auth-secret>

# その他の環境変数
# 必要に応じて追加
```

#### 環境変数の取得方法

**Convex のセットアップ:**

```bash
# Convex CLI のインストール（グローバル）
pnpm add -g convex

# Convex プロジェクトの初期化（初回のみ）
npx convex dev

# 初回実行時にブラウザが開き、Convex アカウントでログインします
# プロジェクトを作成または選択すると、自動的に環境変数が設定されます
```

初回実行後、`.env.local` が自動生成または更新されます。

**AUTH_SECRET の生成:**

```bash
# OpenSSL で安全なランダム文字列を生成
openssl genpkey -algorithm RSA -out /dev/null -pkeyopt rsa_keygen_bits:2048 2>&1 | grep -v "writing" | head -c 32 | base64
```

生成された文字列を `.env.local` の `AUTH_SECRET` に設定してください。

### 7. Convex のセットアップ

開発環境で Convex を起動します。

```bash
# 別のターミナルウィンドウで実行
npx convex dev
```

このコマンドは常に起動したままにしておく必要があります。Convex がバックエンドとして機能します。

### 8. 開発サーバーの起動

```bash
# 開発サーバーを起動
pnpm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いて、アプリケーションが正しく動作することを確認します。

### 9. コードの品質チェック

開発を始める前に、以下のコマンドが正常に動作することを確認します。

```bash
# 型チェック
pnpm run lint

# ビルド
pnpm run build
```

すべてのコマンドがエラーなく完了すれば、セットアップは完了です！

## 開発時のワークフロー

### 通常の開発

1. **2つのターミナルを開く:**
   - ターミナル1: `npx convex dev`（Convex サーバー）
   - ターミナル2: `pnpm run dev`（Next.js 開発サーバー）

2. **コードを編集**

3. **ブラウザで動作確認**

### コミット前の確認

コミット時に **lint-staged** が自動実行され、ステージされたファイルに対してフォーマットとリントが適用されます。手動での確認は不要ですが、ビルドの動作確認をしたい場合は以下を実行してください：

```bash
# ビルド確認（オプション）
pnpm run build
```

詳細な開発フローは [development-workflow.md](./development-workflow.md) を参照してください。

## トラブルシューティング

### pnpm install でエラーが出る

```bash
# node_modules と lockfile を削除してクリーンインストール
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Convex dev が起動しない

```bash
# Convex にログインし直す
npx convex logout
npx convex dev
```

### ポートが既に使用されている

```bash
# Next.js のポートを変更
pnpm run dev -- -p 3001

# または使用中のプロセスを確認
lsof -i :3000
```

### 型エラーが大量に出る

```bash
# TypeScript のキャッシュをクリア
rm -rf .next
rm tsconfig.tsbuildinfo
pnpm run lint
```

## その他の便利なコマンド

### テストの実行

```bash
# Unit テスト
pnpm run test

# Unit テスト（UI モード）
pnpm run test:ui

# E2E テスト（Playwright のインストールが必要）
pnpm exec playwright install
pnpm run test:e2e

# E2E テスト（UI モード）
pnpm run test:e2e:ui
```

### コードフォーマット

```bash
# Biome でフォーマット
pnpm run format
```

### Convex のデプロイメント管理

```bash
# 本番環境へのデプロイ（main ブランチから）
npx convex deploy

# 環境変数の確認
npx convex env list

# 環境変数の設定
npx convex env set KEY value
```

## 推奨 VS Code 拡張機能

開発効率を上げるために、以下の拡張機能をインストールすることをお勧めします：

- **Biomejs**: Biome のサポート
- **Tailwind CSS IntelliSense**: Tailwind の補完
- **TypeScript Vue Plugin (Volar)**: TypeScript サポート強化
- **GitLens**: Git の統合
- **Playwright Test for VSCode**: Playwright テストのサポート

## 次のステップ

セットアップが完了したら、以下のドキュメントを参照して開発を進めてください：

1. [開発ワークフロー](./development-workflow.md) - ブランチ戦略とコミット規約
2. [プロジェクト概要](../project.md) - プロジェクトの全体像
3. [アーキテクチャ](../architecture.md) - 技術スタックと設計方針

---

最終更新: 2025年11月30日
