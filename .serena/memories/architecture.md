# アーキテクチャ

## ディレクトリ構造

```
okusuri-support/
├── app/                        # Next.js App Router
│   ├── (authenticated)/        # 認証済みユーザー向けページ
│   │   ├── dashboard/          # ダッシュボードページ
│   │   │   └── _components/    # ダッシュボード専用コンポーネント
│   │   ├── onboarding/         # オンボーディングページ
│   │   │   ├── _components/    # オンボーディングコンポーネント
│   │   │   └── _hooks/         # オンボーディングフック
│   │   ├── invite/             # 招待ページ
│   │   │   └── [code]/         # 招待コード受け取りページ
│   │   └── settings/           # 設定ページ
│   │       └── _components/    # 設定ページ専用コンポーネント
│   ├── (guest)/               # 未認証ユーザー向けページ
│   │   └── login/             # ログインページ
│   ├── _shared/               # アプリ全体で共有するリソース
│   │   ├── components/        # 共有UIコンポーネント
│   │   │   ├── ui/           # shadcn/ui コンポーネント
│   │   │   └── layouts/      # レイアウトコンポーネント
│   │   ├── features/         # 機能別コンポーネント
│   │   │   ├── auth/         # 認証機能
│   │   │   ├── group/        # グループ機能
│   │   │   └── medication/   # 服薬管理機能
│   │   ├── lib/              # ユーティリティ
│   │   │   ├── utils.ts      # 汎用ユーティリティ
│   │   │   ├── date-fns.ts   # 日時処理
│   │   │   ├── logger.ts     # ロギング
│   │   │   ├── convex.ts     # Convex API再エクスポート
│   │   │   └── provider/     # Providerコンポーネント
│   │   └── types/            # 型定義の再エクスポート層
│   │       └── result.ts     # Result型の再エクスポート
│   ├── api/                  # APIルート
│   ├── page.tsx              # トップページ
│   ├── layout.tsx            # ルートレイアウト
│   └── globals.css           # グローバルCSS
├── convex/                   # Convexバックエンド
│   ├── types/                # 共有型定義
│   │   └── result.ts         # Result型の実装本体
│   ├── _generated/           # Convex自動生成ファイル
│   ├── auth.ts               # 認証設定
│   ├── auth.config.ts        # 認証設定詳細
│   ├── groups/               # グループ関連関数
│   ├── invitations/          # 招待機能
│   ├── medications/          # 服薬記録関数
│   ├── users/                # ユーザー関連関数
│   ├── schema.ts             # データベーススキーマ
│   └── http.ts               # HTTPルート
├── middleware.ts             # Next.jsミドルウェア（認証）
└── public/                   # 静的アセット

## パスエイリアス設定

### TypeScript (tsconfig.json)
```json
{
  "paths": {
    "@/*": ["./app/_shared/*"]
  }
}
```

### Vitest (vitest.config.ts)
```typescript
{
  alias: {
    "@": path.resolve(__dirname, "./app/_shared"),
    "@convex": path.resolve(__dirname, "./convex"),
  }
}
```

### shadcn/ui (components.json)
```json
{
  "aliases": {
    "components": "app/_shared/components",
    "utils": "app/_shared/lib/utils",
    "ui": "app/_shared/components/ui",
    "lib": "app/_shared/lib",
    "hooks": "app/_shared/hooks"
  }
}
```

## インポートパスの規約

### 共有リソースのインポート
```typescript
// UIコンポーネント
import { Button } from "@/components/ui/button";

// ユーティリティ
import { cn } from "@/lib/utils";

// Convex API
import { api } from "@/lib/convex";
import type { Id } from "@/lib/convex";

// 機能コンポーネント
import { SignOutButton } from "@/features/auth";
import { GroupSwitcher } from "@/features/group";

// 型定義
import type { Result } from "@/types/result";
```

### ローカルコンポーネントのインポート
```typescript
// ページ固有のコンポーネント（相対パス）
import { DashboardHeader } from "./_components/DashboardHeader";
import { useOnboardingFlow } from "./_hooks";
```

### Convexからの型参照
```typescript
// app/_shared/types/result.ts から再エクスポート
export type { Result } from "../../../convex/types/result";
export { success, error } from "../../../convex/types/result";
```

## 変更履歴

### 2025年10月23日 - ディレクトリ構造の再編成

#### 第一次移行（未完了）
- `src/app` → `/app` に移動
- `src/shared/components` → `/components` に移動
- `src/shared/lib` → `/lib` に移動
- `src/features` → `/features` に移動

#### 第二次移行（最終構成）
- `/app/_shared/` 配下に集約
- パスエイリアス `@/*` を `./app/_shared/*` に設定
- `convex/shared/types` → `convex/types` に移動
- `app/_shared/types/` で再エクスポート

#### 修正内容
- [tsconfig.json](tsconfig.json:21-23): `"@/*": ["./app/_shared/*"]`
- [vitest.config.ts](vitest.config.ts:37-42): パスエイリアス更新
- [components.json](components.json:14-20): shadcn/ui エイリアス更新
- 全ファイルのインポートパスを一括修正
  - `@/app/_shared/` → `@/` に統一
  - 相対パス参照の修正

## データモデル

### groups（グループ）
- name: string
- description?: string
- createdAt: number

### groupMembers（グループメンバー）
- groupId: Id<"groups">
- userId: string (Convex Auth userId)
- role: "patient" | "supporter"
- joinedAt: number

### medications（服薬情報）
- userId: string
- groupId: Id<"groups">
- name: string
- timings: ("morning" | "noon" | "evening" | "bedtime" | "asNeeded")[]
- dosage?: string
- notes?: string

### medicationRecords（服薬記録）
- medicationId: Id<"medications">
- userId: string
- timing: "morning" | "noon" | "evening" | "bedtime" | "asNeeded"
- scheduledDate: string (YYYY-MM-DD)
- takenAt?: number
- status: "pending" | "taken" | "skipped"
- recordedBy: string
- notes?: string

## 認証フロー

1. GitHub OAuthで認証
2. Convex Authがセッション管理
3. ミドルウェアで認証状態確認
4. 未認証 → トップページへリダイレクト
5. 認証済みでグループ未設定 → オンボーディングへ
6. 認証済みでグループ設定済み → ダッシュボードへ

## 型の共有戦略

### Result型の例
- **実装**: [convex/types/result.ts](convex/types/result.ts)（Single Source of Truth）
- **再エクスポート**: [app/_shared/types/result.ts](app/_shared/types/result.ts)
- **Convex内**: `import { Result } from "../types/result"`
- **フロントエンド**: `import { Result } from "@/types/result"`

この構成により、Convexのビルドシステムとの互換性を保ちつつ、フロントエンドとバックエンドで型を共有できます。
