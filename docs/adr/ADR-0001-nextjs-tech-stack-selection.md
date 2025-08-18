# ADR-0001 Next.js 基本セットアップ技術選定

## ステータス

Accepted

## 変更履歴

- 2025-08-17: 初版作成
- 2025-08-17: レビュー指摘事項を反映し、技術的制約と回避策を明確化

## コンテキスト

お薬サポートアプリケーションの Next.js 基本セットアップにおいて、適切な技術スタックの選定が必要となった。Node.js 環境から Next.js への移行において、以下の観点から技術選定を行う必要がある：

- React 19 + Server Components を活用したモダンなアーキテクチャ構築
- 高速なスタイリングシステムの採用
- 保守性と開発体験を重視したコンポーネントライブラリ選択
- Feature-based Architecture との整合性確保
- 完全なテスト戦略の構築

プロジェクトの特性として、患者と支援者向けの優しい UX/UI 設計が求められ、TypeScript strict mode、YAGNI 原則の徹底、LLM 主導実装が前提となる。

## 決定事項

以下の技術スタックを採用する：

1. **Next.js 15** - React 19 + Server Components 基盤
2. **Tailwind CSS v4** - 高速スタイリングシステム
3. **shadcn/ui（制約考慮）** - カスタマイズ性重視のコンポーネントライブラリ
   - canary 版使用によるリスクを承知の上で採用
   - @radix-ui/react-icons 代替として react-icons または lucide-react を使用
4. **Feature-based Architecture** - LLM 最適化アーキテクチャ
5. **段階的テスト環境** - Vitest → Playwright → Storybook（条件付き）
   - Storybook 統合に失敗した場合は TestingLibrary + Jest 併用
   - 既知の回避策（React モジュールエイリアス設定）を適用

## 技術的制約と回避策

### 1. テスト統合の制約

- **制約**: `@storybook/addon-vitest`の Next.js 15 互換性問題
- **回避策**: vitest.config.ts での React モジュールエイリアス設定
- **代替案**: TestingLibrary + Jest 併用への切り替え準備

### 2. shadcn/ui 導入の制約

- **制約**: Next.js 15 対応が canary 版段階
- **回避策**: 段階的導入とリスク評価の継続実施
- **代替案**: アイコンライブラリの代替パッケージ使用

### 3. 移行期間の制約

- **制約**: 既存システムとの並行運用が必要
- **回避策**: 2 週間の段階的移行と即座ロールバック体制
- **代替案**: 問題発生時の従来環境への即座復帰

## 根拠

### 検討した選択肢

#### 1. Next.js フレームワーク選択

**案 A: Next.js 14 (安定版重視)**

- 利点:
  - 安定性が証明済み
  - 豊富なリソースとコミュニティサポート
  - 本番環境でのリスクが低い
- 欠点:
  - React 18 ベースで最新機能を活用できない
  - Server Components の機能が制限的
  - Turbopack が実験的機能

**案 B: Vite + React (軽量性重視)**

- 利点:
  - 最高の開発体験（高速 HMR）
  - 軽量で柔軟性が高い
  - カスタマイズが容易
- 欠点:
  - Server Components の恩恵を受けられない
  - フルスタック機能が不足
  - SSR の設定が複雑

**案 C: Next.js 15 (採用)**

- 利点:
  - React 19 完全統合による Server Components 最適活用
  - Turbopack 安定化により 5 倍高速ビルド
  - モダンなアーキテクチャパターンに対応
  - 将来性とパフォーマンス最適化
- 欠点:
  - 新バージョンによる未知のリスク
  - 一部のサードパーティライブラリの対応待ち

#### 2. スタイリングシステム選択

**案 A: CSS Modules (従来型)**

- 利点:
  - スコープ分離が明確
  - TypeScript 統合が容易
  - パフォーマンスが安定
- 欠点:
  - 開発速度が遅い
  - デザインシステムの一貫性確保が困難
  - ユーティリティクラスの恩恵なし

**案 B: Styled Components (CSS-in-JS)**

- 利点:
  - 動的スタイリングが容易
  - JavaScript との統合が自然
  - テーマシステムが豊富
- 欠点:
  - ランタイムオーバーヘッド
  - Server Components との相性が悪い
  - バンドルサイズの増加

**案 C: Tailwind CSS v4 (採用)**

- 利点:
  - 100 倍高速なインクリメンタルビルド（マイクロ秒単位）
  - 設定レスで zero configuration
  - CSS-first の設定により直感的
  - @import のみで使用開始可能
- 欠点:
  - v4 はまだ新しくエコシステムが発展途上
  - 学習コストがチームによっては高い

#### 3. コンポーネントライブラリ選択

**案 A: Material UI (MUI)**

- 利点:
  - 豊富なコンポーネント（100+）
  - Google Material Design 準拠
  - 企業レベルのサポート
- 欠点:
  - カスタマイズが困難（スタイルオーバーライド複雑）
  - バンドルサイズが大きい
  - デザインの独自性を出しにくい

**案 B: Ant Design**

- 利点:
  - 高機能なコンポーネント（データテーブル等）
  - エンタープライズ向けの豊富な機能
  - アクセシビリティ対応
- 欠点:
  - デザインのカスタマイズ性が低い
  - 中国企業製への懸念
  - Tailwind CSS との統合が困難

**案 C: shadcn/ui (採用・制約考慮)**

- 利点:
  - Radix UI + Tailwind CSS 基盤で品質と柔軟性を両立
  - コピー&ペーストによる完全制御
  - Feature-based Architecture と親和性が高い
  - ダークモード・アクセシビリティ標準対応
- 欠点:
  - 高機能コンポーネント（チャート等）は別途必要
  - コンポーネント数が MUI より少ない
  - **Next.js 15 対応は canary 版段階**: 安定性リスクあり
  - **@radix-ui/react-icons**: React 19 peer dependency に未対応

#### 4. テスト戦略選択

**案 A: Jest + React Testing Library (従来型)**

- 利点:
  - 安定したエコシステム
  - 豊富なドキュメント
  - 広く採用されている
- 欠点:
  - ESM 対応が不完全
  - セットアップが複雑
  - Vite との統合で問題が生じやすい

**案 B: 最小限テスト（E2E のみ）**

- 利点:
  - セットアップが簡単
  - 重要機能に集中できる
  - 保守コストが低い
- 欠点:
  - バグの早期発見が困難
  - リファクタリング時の安全性が低い
  - 品質保証が不十分

**案 C: Vitest + Playwright + Storybook (採用・段階的導入)**

- 利点:
  - Vitest: Next.js 15・Vite との完全統合、250 テスト 6.5 秒実行
  - Playwright: ブラウザテスト・ビジュアル回帰・モバイル対応
  - Storybook 8: リアルタイムテスト・Vitest 統合・2-4 倍高速ビルド
- 欠点:
  - 初期セットアップの複雑性
  - 3 つのツールの習得コスト
  - **既知の互換性問題**: `@storybook/addon-vitest`が Next.js 15 で React モジュール解決の競合

**案 D: TestingLibrary + Jest 併用 (代替案)**

- 利点:
  - Next.js 15 での安定性が証明済み
  - 既存チームの知識を活用可能
  - セットアップの複雑性が低い
- 欠点:
  - パフォーマンスが Vitest より劣る
  - モダンなテスト体験の恩恵を受けられない

## 比較マトリクス

| 評価軸                 | 案 A (安定重視) | 案 B (軽量重視) | 案 C (モダン重視・採用) |
| ---------------------- | --------------- | --------------- | ----------------------- |
| 開発速度               | 中              | 高              | 高                      |
| 将来性                 | 中              | 中              | 高                      |
| パフォーマンス         | 中              | 高              | 高                      |
| 学習コスト             | 低              | 中              | 中                      |
| 保守性                 | 高              | 中              | 高                      |
| Feature-based 親和性   | 中              | 高              | 高                      |
| Server Components 活用 | 低              | なし            | 高                      |
| 総合リスク             | 低              | 中              | 中                      |

## 影響

### ポジティブな影響

- **パフォーマンス向上**: Next.js 15 の Turbopack + Tailwind v4 で劇的なビルド時間短縮
- **開発体験向上**: Server Components + shadcn/ui によるモダンな開発フロー
- **品質向上**: 統合テスト環境による継続的品質保証
- **保守性向上**: Feature-based Architecture との組み合わせで LLM 実装効率最大化
- **将来性確保**: 最新技術採用により長期的な技術的負債回避

### ネガティブな影響

- **学習コスト**: チーム全体でのモダン React・Next.js 15 キャッチアップが必要
- **初期リスク**: 新バージョン採用による未知の問題発生可能性
- **エコシステム依存**: 一部サードパーティライブラリの Next.js 15 対応待ち
- **テスト統合リスク**: Storybook + Vitest の組み合わせで既知の互換性問題
- **shadcn/ui 制約**: canary 版使用による安定性リスクと依存関係の未対応
- **移行複雑性**: 既存コードベースからの段階的移行に伴う一時的な複雑性増加

### 中立的な影響

- **開発プロセス変更**: Server Components パターンへの開発フロー移行
- **ツールチェーン変更**: 従来の Jest→Vitest への移行
- **設定ファイル変更**: Tailwind v4 の CSS-first 設定への移行

## 実装への指針

### アーキテクチャ原則

- Server Components と Client Components の適切な分離を実装
- Feature-based 構造でコンポーネントとロジックを自己完結させる
- shadcn/ui コンポーネントは必要な部分のみコピー&ペーストで導入

### テスト戦略（段階的導入）

**Phase 1: Vitest 単体導入**

- 単体テスト・統合テストを Vitest で構築
- React Component のレンダリングテスト
- ビジネスロジック部分の確実な動作保証

**Phase 2: Playwright 統合**

- E2E テストの段階的追加
- ブラウザテストによる実環境動作保証
- ビジュアル回帰テストの構築

**Phase 3: Storybook 統合（条件付き）**

- **既知の回避策実装後**の Storybook 統合
- `vitest.config.ts`での React モジュールエイリアス設定:
  ```typescript
  resolve: {
    alias: {
      'react': require.resolve('react'),
      'react-dom': require.resolve('react-dom')
    }
  }
  ```
- 統合に失敗した場合は TestingLibrary + Jest 併用に切り替え

### パフォーマンス最適化（測定可能指標）

**測定ベースライン設定**

- First Contentful Paint (FCP): 目標 1.2 秒以下
- Largest Contentful Paint (LCP): 目標 2.5 秒以下
- Cumulative Layout Shift (CLS): 目標 0.1 以下
- 測定ツール: Lighthouse CI + Web Vitals

**最適化実装**

- Dynamic Imports による適切なコード分割
- Next.js Image コンポーネントの積極活用
- React 19 の use フックによる非同期データストリーミング

**効果測定手順**

```bash
# ベースライン測定
npx lighthouse-ci autorun --collect.numberOfRuns=5

# 最適化後の効果測定
npm run build && npm run start
npx lighthouse-ci autorun --collect.numberOfRuns=5

# Web Vitals測定（実装後）
npm install web-vitals
# 本番環境でのリアルユーザーメトリクス収集
```

### 移行戦略（具体的手順）

**Step 1: 環境構築**

- package.json の依存関係競合解決:
  ```bash
  # 既存依存削除
  npm uninstall @types/node typescript
  # Next.js版に統一
  npm install next@15 react@19 react-dom@19 typescript@5
  ```

**Step 2: ファイル構造移行**

- `src/index.ts` → `app/page.tsx`への変換:

  ```typescript
  // Before: src/index.ts
  export { default } from "./App";

  // After: app/page.tsx
  export default function HomePage() {
    return <App />;
  }
  ```

**Step 3: テスト設定移行**

- 既存 Vitest テスト設定の統合:

  ```typescript
  // vitest.config.ts → 既存設定にNext.js対応追加
  import { defineConfig } from "vitest/config";
  import react from "@vitejs/plugin-react";

  export default defineConfig({
    plugins: [react()],
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
    },
  });
  ```

**Step 4: shadcn/ui 制約対応**

- canary 版使用のリスク評価実施
- @radix-ui/react-icons 代替パッケージ準備:
  ```bash
  # 代替案: react-icons使用
  npm install react-icons
  # または: lucide-react使用
  npm install lucide-react
  ```

**Step 5: 並行運用期間**

- 2 週間の並行運用で重要機能の動作確認
- パフォーマンス指標の継続測定
- 問題発生時の即座ロールバック体制確立

## 関連情報

### 参考資料

- [Next.js 15 公式リリースノート](https://nextjs.org/blog/next-15) - React 19 統合と Turbopack 安定化
- [React 19 公式発表](https://react.dev/blog/2024/12/05/react-19) - Server Components 改善と Actions 統合
- [Tailwind CSS v4 パフォーマンス解析](https://tailwindcss.com/blog/tailwindcss-v4) - 100 倍高速ビルドの詳細
- [shadcn/ui アーキテクチャ解説](https://ui.shadcn.com/) - コピー&ペーストアプローチの利点
- [Vitest + Playwright + Storybook 統合事例](https://www.defined.net/blog/modern-frontend-testing/) - モダンテスト戦略実装例
- [Feature-based Architecture with Next.js](https://www.thecandidstartup.org/2025/01/06/component-test-playwright-vitest.html) - LLM 最適化アーキテクチャパターン
- [Next.js 15 + Storybook 互換性問題](https://github.com/storybookjs/storybook/issues/28303) - @storybook/addon-vitest の既知問題
- [shadcn/ui Next.js 15 対応状況](https://github.com/shadcn-ui/ui/discussions/3734) - canary 版使用時の注意事項
- [React 19 Migration Guide](https://react.dev/blog/2024/12/05/react-19#upgrading-to-react-19) - peer dependency 対応状況
- [Lighthouse CI 公式ドキュメント](https://github.com/GoogleChrome/lighthouse-ci) - パフォーマンス測定の実装手順
- [Web Vitals 測定ガイド](https://web.dev/vitals/) - Core Web Vitals の測定方法と目標値

### 関連 ADR

- 今後作成予定: ADR-COMMON-ERROR-HANDLING (エラーハンドリング戦略)
- 今後作成予定: ADR-COMMON-STATE-MANAGEMENT (状態管理戦略)
- 今後作成予定: ADR-COMMON-API-DESIGN (API 設計原則)
