# Group機能のテスト

このディレクトリには、グループ機能（招待機能を含む）のフロントエンドテストが含まれます。

## テスト対象

- コンポーネント
  - グループメンバー一覧表示
  - 招待コード入力フォーム
  - 招待リンク共有UI

- カスタムフック
  - useGroupMembers
  - useInvitation（今後実装予定）

## 実行方法

```bash
# すべてのテストを実行
npm test

# UIモードで実行
npm run test:ui

# カバレッジレポートを生成
npm run test:coverage

# 特定のテストファイルのみ実行
npm test src/features/group
```

## テスト作成ガイドライン

1. コンポーネントテストは`@testing-library/react`を使用
2. モックには`vitest.mock()`を使用
3. Convex関連のモックは適切にセットアップ
4. 各テストは独立して実行可能に
