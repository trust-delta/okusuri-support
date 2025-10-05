# タスク完了時のワークフロー

## コード品質チェック

### 1. Linting
```bash
npm run lint
```
- Biomeによるコード品質チェック
- エラーがある場合は修正が必要

### 2. フォーマット
```bash
npm run format
```
- コードの自動整形

### 3. 型チェック
```bash
npx tsc --noEmit
```
- TypeScriptの型エラーチェック
- any型の使用は禁止

## ビルド確認

### 開発ビルド
```bash
npm run dev
```
- 開発サーバーで動作確認

### 本番ビルド
```bash
npm run build
```
- 本番環境用にビルド成功を確認

## Convex関連

### スキーマ変更時
```bash
npx convex dev
```
- スキーマ変更をConvexに反映

### デプロイ前
```bash
npx convex deploy
```
- Convex関数のデプロイ

## Git操作

### コミット前チェックリスト
1. Linting/Format完了
2. 型エラーなし
3. ビルド成功
4. 動作確認完了

### コミット
```bash
git add .
git commit -m "descriptive message"
git push
```
