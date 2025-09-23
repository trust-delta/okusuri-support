# Project Structure Steering Document

## Root Directory Organization
```
okusuri-support/
├── .claude/                # Claude Code configuration
│   └── commands/          # カスタムコマンド定義
├── .kiro/                 # Kiro spec-driven development
│   ├── specs/            # 機能仕様書
│   └── steering/         # ステアリング文書（このディレクトリ）
├── .next/                 # Next.js ビルド出力（Git管理外）
├── convex/                # Convex バックエンド
├── node_modules/          # NPM依存関係（Git管理外）
├── public/                # 静的アセット
└── src/                   # ソースコード
```

## Subdirectory Structures

### `/src` - Application Source Code
```
src/
├── app/                   # Next.js App Router
│   ├── layout.tsx        # ルートレイアウト
│   ├── page.tsx          # ホームページ
│   ├── provider.tsx      # グローバルプロバイダー
│   └── globals.css       # グローバルスタイル
├── components/            # React コンポーネント
│   └── ui/               # UIコンポーネント
│       ├── button.tsx    # ボタンコンポーネント
│       └── sonner.tsx    # トースト通知
└── lib/                   # ユーティリティ関数
    └── utils.ts          # 共通ユーティリティ
```

### `/convex` - Backend Logic
```
convex/
├── _generated/            # Convex自動生成ファイル
│   ├── api.d.ts          # API型定義
│   ├── api.js            # APIクライアント
│   ├── dataModel.d.ts    # データモデル型
│   ├── server.d.ts       # サーバー型定義
│   └── server.js         # サーバー実装
├── auth.config.ts         # 認証設定
├── messages.ts           # メッセージ関連のQuery/Mutation
├── tasks.ts              # タスク関連のQuery/Mutation
└── schema.ts             # データベーススキーマ定義（作成予定）
```

### `/.claude` - Claude Code Configuration
```
.claude/
└── commands/              # カスタムコマンド
    └── kiro:*/           # Kiroコマンド群
```

### `/.kiro` - Spec-Driven Development
```
.kiro/
├── specs/                 # 機能仕様
│   └── [feature-name]/   # 機能別ディレクトリ
│       ├── requirements.md
│       ├── design.md
│       └── tasks.md
└── steering/             # ステアリング文書
    ├── product.md        # プロダクト概要
    ├── tech.md          # 技術スタック
    └── structure.md     # プロジェクト構造（本文書）
```

## Code Organization Patterns

### Component Structure
```typescript
// components/feature/ComponentName.tsx
- Default export for main component
- Named exports for sub-components
- Props interface defined above component
- Custom hooks in same file if component-specific
```

### Convex Function Pattern
```typescript
// convex/feature.ts
- Query functions: データ取得
- Mutation functions: データ更新
- Action functions: 外部連携
- Internal functions: _プレフィックス付き
```

### Page Structure (App Router)
```typescript
// app/route/page.tsx
- "use client" directive for client components
- Metadata export for SEO
- Default export for page component
- Loading/Error boundaries in same directory
```

## File Naming Conventions

### General Rules
- **ファイル名**: kebab-case または camelCase
- **コンポーネント**: PascalCase.tsx
- **ユーティリティ**: camelCase.ts
- **設定ファイル**: kebab-case.config.ts
- **型定義**: types.ts または *.d.ts

### Specific Patterns
```
Components:     Button.tsx, UserProfile.tsx
Pages:          page.tsx (App Router convention)
Layouts:        layout.tsx (App Router convention)
Utilities:      utils.ts, helpers.ts
Hooks:          useHookName.ts
Types:          types.ts, user.types.ts
Constants:      constants.ts
Config:         app.config.ts
```

## Import Organization

### Import Order (Biome auto-organized)
```typescript
1. React/Next.js imports
2. Third-party library imports
3. Convex imports
4. Absolute imports (@/*)
5. Relative imports (../)
6. Type imports
```

### Path Aliases
```typescript
// tsconfig.json paths
@/*          → src/*
@/components → src/components
@/lib        → src/lib
@/app        → src/app
```

### Example Import Structure
```typescript
// React/Next
import { useState } from "react";
import type { Metadata } from "next";

// Third-party
import { SignInButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";

// Project imports
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { utils } from "@/lib/utils";

// Types
import type { User } from "@/types";
```

## Key Architectural Principles

### 1. Server/Client Component Separation
- Server Components: デフォルト（データフェッチング、SEO）
- Client Components: "use client" 明示（インタラクティブUI）

### 2. Type Safety First
- TypeScript strict mode
- 型推論の活用
- any型の使用禁止
- Convex スキーマによる型生成

### 3. Component Composition
- Atomic Design の部分採用
- UI コンポーネントは再利用可能に
- ビジネスロジックとUIの分離

### 4. Real-time by Default
- Convex Reactive Queries
- WebSocket による自動同期
- 楽観的UI更新

### 5. Progressive Enhancement
- PWA対応
- オフラインファースト設計
- 段階的な機能強化

### 6. Security Layers
- 認証: Clerk（フロントエンド）
- 認可: Convex（バックエンド）
- データバリデーション: 両端で実施

## Directory Creation Guidelines

### 新機能追加時
1. `/src/app/[feature]/` - ページルート作成
2. `/src/components/[feature]/` - 機能固有コンポーネント
3. `/convex/[feature].ts` - バックエンドロジック
4. `/.kiro/specs/[feature]/` - 仕様書作成

### コンポーネント追加時
- 共通UI → `/src/components/ui/`
- 機能固有 → `/src/components/[feature]/`
- レイアウト → `/src/components/layout/`

### ユーティリティ追加時
- 汎用関数 → `/src/lib/utils.ts`
- ドメイン固有 → `/src/lib/[domain].ts`
- フック → `/src/hooks/`

## Build Output Structure
```
.next/                     # ビルド成果物（Git管理外）
├── static/               # 静的アセット
├── server/              # サーバーサイドコード
└── cache/               # ビルドキャッシュ
```

## Testing Structure (Future)
```
__tests__/                # テストファイル
├── unit/                # ユニットテスト
├── integration/         # 統合テスト
└── e2e/                # E2Eテスト
```