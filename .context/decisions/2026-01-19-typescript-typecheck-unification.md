# 決定記録: TypeScript型チェックの統一（tsc/next build 不整合解決）

**日付**: 2026年01月19日
**ステータス**: 実装完了
**決定者**: 開発チーム

## 背景

### 問題

`tsc --noEmit` と `next build` で型チェックの結果が異なり、特に Convex の TS2589（型深度エラー）で以下の不整合が発生していました：

| 環境 | `@ts-expect-error` なし | `@ts-expect-error` あり |
|------|------------------------|------------------------|
| `tsc --noEmit` | TS2589 エラー | パス |
| `next build` | パス | TS2578（未使用）エラー |

### 原因

1. **Turbopack と tsc の型チェック方式の違い**: Next.js 16 は Turbopack を使用し、内部で異なる方法で TypeScript を処理
2. **型チェック対象範囲の違い**: `tsc` はルート `tsconfig.json` の `include` 全体をチェックするが、`next build` はアプリ領域のみ
3. **Convex 型システムの複雑さ**: `api`/`internal` 参照で型深度が深くなり、エンジンによって挙動が異なる

## 決定

### 1. 型チェックを `tsc` に統一

`next build` の型チェックをスキップし、`tsc --noEmit` で一貫した型チェックを実施する。

**next.config.ts**:
```typescript
const nextConfig: NextConfig = {
  // TypeScript の型チェックを tsc --noEmit に委譲
  // Turbopack と tsc で TS2589 の発生有無が異なるため、型チェックを統一
  typescript: {
    ignoreBuildErrors: true,
  },
  // ...
};
```

### 2. tsconfig の分離

ルート `tsconfig.json` から `convex/`、`e2e/`、テストファイルを除外し、Next.js アプリ領域のみをチェック対象にする。

**tsconfig.json**:
```json
{
  "include": [
    "next-env.d.ts",
    "app/**/*.ts",
    "app/**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts"
  ],
  "exclude": ["node_modules", "convex", "e2e", "**/*.test.ts", "**/*.test.tsx"]
}
```

### 3. 型チェックスクリプトの追加

**package.json**:
```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "typecheck:convex": "tsc --noEmit -p convex/tsconfig.json"
  }
}
```

### 4. CI で明示的に型チェックを実行

**.github/workflows/ci.yml**:
```yaml
- name: 型チェックを実行（Next.js アプリ）
  run: pnpm run typecheck

- name: 型チェックを実行（Convex バックエンド）
  run: pnpm run typecheck:convex

- name: Lint を実行
  run: pnpm run lint

- name: ビルドを実行
  run: pnpm run build
```

## 理由

### `next build` の型チェックをスキップする理由

1. **一貫性**: `tsc` を唯一の型チェックエンジンにすることで、ローカル・CI・IDE 間の結果が統一される
2. **Turbopack の挙動差**: Turbopack の TypeScript 処理は `tsc` と完全に同一ではない
3. **制御可能性**: `tsc` の設定は `tsconfig.json` で完全に制御できる

### tsconfig を分離する理由

1. **責務の明確化**: Next.js アプリと Convex バックエンドは異なる実行環境を持つ
2. **エラーの局所化**: 問題発生時にどの領域のエラーか特定しやすい
3. **CI の透明性**: 型チェックの対象範囲が明確

## 利点

✅ **環境間の一貫性**: `tsc`, IDE, CI で同じ結果が得られる
✅ **デバッグ容易性**: 型エラーの原因が特定しやすい
✅ **柔軟な設定**: 領域ごとに異なる TypeScript 設定が可能
✅ **CI の明示性**: どの領域の型チェックが失敗したか即座にわかる

## 欠点と対応策

❌ **`next build` で型エラーが検出されない**
  → **対応**: CI で `tsc --noEmit` を必ず実行、ビルド前に型チェックが通ることを保証

❌ **設定ファイルが増える**
  → **対応**: 役割を明確にドキュメント化、スクリプト名で目的を明示

❌ **二重の型チェック実行で CI 時間が増加**
  → **対応**: 現状では許容範囲（各数秒程度）、問題があれば並列実行を検討

## 代替案

### 代替案1: TypeScript バージョンの完全統一

Next.js 内部の TypeScript と `tsc` のバージョンを一致させる。

**却下理由**: Next.js 16 は TypeScript を内部にバンドルしておらず、Turbopack の処理方式自体が異なるため効果がない

### 代替案2: `@ts-ignore` の使用

`@ts-expect-error` の代わりに `@ts-ignore` を使用し、両方でパスさせる。

**却下理由**: 将来の型エラーも無視してしまい、型安全性が低下

### 代替案3: 型ヘルパー関数の作成

`useQuery` などのラッパーを作成して型推論の深度を減らす。

**却下理由**: コードが複雑化し、Convex の型情報が失われる。保守コストが高い

## 影響を受けるファイル

| ファイル | 変更内容 |
|----------|----------|
| `tsconfig.json` | `include`/`exclude` の調整 |
| `next.config.ts` | `typescript.ignoreBuildErrors: true` |
| `package.json` | `typecheck`, `typecheck:convex` スクリプト追加 |
| `.github/workflows/ci.yml` | 型チェックステップの分離 |
| `app/**/*.tsx` | 必要に応じて `@ts-expect-error` 追加 |

## 運用ガイドライン

### 開発時

```bash
# アプリの型チェック
pnpm run typecheck

# Convex の型チェック
pnpm run typecheck:convex

# ビルド（型チェックはスキップ）
pnpm run build
```

### 新しい TS2589 エラーが発生した場合

1. エラー発生箇所を特定
2. `@ts-expect-error Convex型インスタンス化の深度制限を回避` を API 参照の直前に追加
3. `pnpm run typecheck` でパスすることを確認

### CI でのフロー

```
typecheck → typecheck:convex → lint → build → test
```

型チェックが失敗した場合、後続のステップは実行されない。

## 関連ドキュメント

- [決定記録: Convex型深度エラー対策](./2026-01-18-convex-type-depth-error-workaround.md)
- [.context/coding-style.md](../coding-style.md) - 型インスタンス化エラー対策セクション
- [Next.js TypeScript Configuration](https://nextjs.org/docs/app/building-your-application/configuring/typescript)

## 更新履歴

| 日付 | 更新内容 |
|------|---------|
| 2026-01-19 | 初版作成 |
