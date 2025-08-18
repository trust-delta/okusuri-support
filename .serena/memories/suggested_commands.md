# 推奨コマンド一覧

## 基本開発コマンド

### アプリケーション実行
```bash
npm run dev          # 開発サーバー起動（http://localhost:3000）
npm run build        # プロダクションビルド
npm run start        # プロダクション環境でサーバー起動
```

### テスト実行
```bash
npm test                       # 単体テスト実行（一回のみ）
npm run test:watch             # テスト監視モード
npm run test:ui                # Vitest UI起動
npm run test:coverage          # カバレッジ付きテスト実行
npm run test:coverage:fresh    # キャッシュクリア後カバレッジ測定
npm run test:coverage:summary  # カバレッジサマリー表示
npm run test:safe              # テスト+プロセスクリーンアップ
```

### E2Eテスト
```bash
npm run test:e2e           # Playwright E2Eテスト実行
npm run test:e2e:ui        # Playwright UI モード
npm run test:e2e:report    # テストレポート表示
```

## 品質チェック・修正

### 包括的品質チェック
```bash
npm run check:all      # 全品質チェック実行（推奨）
```

### 個別品質チェック
```bash
npm run check          # Biome check（lint + format）
npm run lint           # Lintチェック
npm run format         # コードフォーマット実行
npm run format:check   # フォーマット確認のみ
```

### 修正コマンド
```bash
npm run check:fix      # Biome自動修正
npm run lint:fix       # Lint自動修正
```

### 依存関係チェック
```bash
npm run check:unused       # 未使用エクスポート検出
npm run check:deps         # 循環依存チェック
npm run check:deps:graph   # 依存関係グラフ生成（graph.svg）
```

## Storybook・デザイン

### Storybook起動
```bash
npm run storybook          # Storybookサーバー起動（port:6006）
npm run build-storybook    # Storybookビルド
```

## パフォーマンス・品質測定

### Lighthouse
```bash
npm run lighthouse         # Lighthouseレポート生成
npm run lighthouse:ci      # CI環境向けLighthouse実行
```

## プロセス管理・クリーンアップ

### プロセス管理
```bash
npm run cleanup:processes  # テスト後プロセス終了処理
```

### キャッシュクリア
```bash
npm run test:coverage:clean  # テストカバレッジキャッシュ削除
```

## 多言語化

### 言語切り替え
```bash
npm run lang:ja        # 日本語環境に切り替え
npm run lang:en        # 英語環境に切り替え
```

## Git・開発準備

### 開発環境準備
```bash
npm install            # 依存関係インストール
npm run prepare        # Huskyセットアップ
```

## システムコマンド（Linux環境）

### ファイル操作
```bash
ls -la                 # ファイル・ディレクトリ一覧表示
find . -name "*.ts"    # TypeScriptファイル検索
grep -r "パターン" src/  # ソースコード内検索
```

### Git操作
```bash
git status             # リポジトリ状態確認
git add .              # 変更ファイルをステージング
git commit -m "メッセージ"  # コミット実行
git push               # リモートにプッシュ
```

## タスク完了時の必須コマンド

開発タスク完了時は以下の順序で実行：

```bash
# 1. 品質チェック
npm run check:all

# 2. テスト実行
npm run test:coverage:fresh

# 3. ビルド確認
npm run build

# 4. E2Eテスト（必要に応じて）
npm run test:e2e
```

品質チェックでエラーが発生した場合、自動修正を試行：
```bash
npm run check:fix
```