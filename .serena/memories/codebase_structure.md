# コードベース構造分析

## ディレクトリ構造

### ルートレベル
```
okusuri-support/
├── app/                    # Next.js App Router（ページ・ルーティング）
├── src/                    # 共有コンポーネント・ロジック
├── docs/                   # ドキュメント・開発ルール
├── scripts/                # 開発支援スクリプト
├── tests/                  # テストファイル
├── .claude/               # Claude Code専用設定
└── 設定ファイル群
```

### App Routerディレクトリ（app/）
Next.js 15のApp Routerパターンを使用：
```
app/
├── layout.tsx              # ルートレイアウト（テーマプロバイダー等）
├── page.tsx               # ホームページ
├── globals.css            # グローバルスタイル
├── providers.tsx          # コンテキストプロバイダー
├── patient/               # 患者管理機能ページ
│   ├── page.tsx          # 患者ページ
│   └── __tests__/        # ページ単位テスト
├── components/            # ページ固有コンポーネント
│   ├── ServerInfo.tsx     # サーバー情報表示
│   └── InteractiveButton.tsx  # インタラクティブボタン
└── __tests__/             # アプリレベルテスト
```

### Srcディレクトリ（src/）
機能別・役割別にモジュール化：
```
src/
├── components/            # 再利用可能UIコンポーネント
│   ├── ui/               # 基本UIコンポーネント（shadcn/ui）
│   │   ├── button.tsx    # ボタンコンポーネント
│   │   ├── card.tsx      # カードコンポーネント
│   │   └── dialog.tsx    # ダイアログコンポーネント
│   ├── icons/            # アイコンコンポーネント
│   └── theme-toggle.tsx  # テーマ切り替えコンポーネント
├── features/             # 機能別コンポーネント群
│   └── patient/          # 患者管理機能
│       ├── types/        # 患者関連型定義
│       └── components/   # 患者関連コンポーネント
│           ├── PatientCard.tsx     # 患者カード
│           └── PatientActions.tsx  # 患者操作
├── hooks/                # カスタムReact Hooks
├── lib/                  # ユーティリティライブラリ
│   └── utils.ts          # 共通ユーティリティ（clsx、cn等）
├── stores/               # 状態管理（Zustand等）
├── types/                # グローバル型定義
├── utils/                # ヘルパー関数
└── stories/              # Storybookファイル群
```

## 主要コンポーネント分析

### UIコンポーネント（shadcn/ui準拠）
- **Button**: Radix UI + class-variance-authorityを使用したバリアント型ボタン
- **Card**: コンテンツ表示用カードレイアウト
- **Dialog**: Radix UI Dialogを使用したモーダル実装

### 患者管理機能
- **PatientCard**: 患者情報表示カード
- **PatientActions**: 患者に対する操作UI
- **Patient Types**: 患者データの型定義

### テーマシステム
- **theme-toggle**: next-themesを使用したライト・ダークモード切り替え
- **ThemeProvider**: アプリ全体のテーマコンテキスト

## テスト構造

### テストパターン
- **単体テスト**: コンポーネント・フック・ユーティリティ
- **統合テスト**: 機能単位の結合テスト
- **E2Eテスト**: Playwrightを使用したエンドツーエンドテスト
- **Storybook**: コンポーネントのビジュアルテスト

### テストファイル配置
```
__tests__/                 # アプリレベルテスト
{component}.test.tsx       # コンポーネント単体テスト
{component}.stories.tsx    # Storybookストーリー
tests/e2e/                # E2Eテスト（予定）
```

## 設定ファイル

### TypeScript設定
- **tsconfig.json**: 厳格な型チェック設定
- **next-env.d.ts**: Next.js型定義

### 品質管理設定
- **biome.json**: Linter・Formatter設定
- **vitest.config.ts**: テスト環境設定
- **playwright.config.ts**: E2Eテスト設定

### ビルド・デプロイ設定
- **next.config.js**: Next.jsビルド設定
- **package.json**: 依存関係・スクリプト定義
- **lighthouserc.json**: パフォーマンス測定設定

## アーキテクチャパターン

### レイヤードアーキテクチャ
1. **Presentation Layer**: app/（ページ・ルーティング）
2. **Component Layer**: src/components/（UI・ドメイン）
3. **Business Logic Layer**: src/features/（機能別ロジック）
4. **Utility Layer**: src/lib/、src/utils/（共通処理）
5. **Type Layer**: src/types/（型定義）

### 機能別モジュール化（Vertical Slice）
患者管理機能を例とした機能別モジュール：
```
src/features/patient/
├── types/          # 患者関連型定義
├── components/     # 患者UIコンポーネント
├── hooks/          # 患者関連カスタムフック
├── services/       # 患者データ操作ロジック
└── index.ts        # 外部向けエクスポート
```