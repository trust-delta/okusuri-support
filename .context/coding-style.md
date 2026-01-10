# コーディングスタイルガイド

> **最終更新**: 2025年11月30日
> **目的**: おくすりサポートプロジェクトの統一されたコーディング規約

---

## 基本原則

### 型安全性
- TypeScript strict モードを使用
- **`any` 型の使用を禁止** - すべての型を明示的に定義
- 型インポートは `import type` で明示

### 言語設定
- すべてのコメントとメッセージは **日本語** で記述
- ユーザー向けのエラーメッセージも日本語

---

## ツール設定

### Linter/Formatter
- **ツール**: Biome 2.2.0
- **設定ファイル**: `biome.json`
- **実行コマンド**:
  - フォーマット: `pnpm run format`
  - リント: `pnpm run lint`

### Pre-commit Hook（自動実行）
- **ツール**: husky 9.x + lint-staged 16.x
- **動作**: コミット時にステージされたファイルに対して `biome check --write` が自動実行される
- **効果**: フォーマット違反は自動修正、lint エラーがある場合はコミットがブロックされる

> **Note**: 手動でのフォーマット/リント実行は基本的に不要です。

### フォーマットルール
```json
{
  "indentStyle": "space",
  "indentWidth": 2,
  "lineEnding": "lf",
  "lineWidth": 80
}
```

---

## ファイル構成

### ディレクトリ構造
```
src/
├── app/                    # Next.js App Router
│   ├── (authenticated)/   # 認証必須ルート
│   └── (public)/          # 公開ルート
├── features/              # 機能モジュール
│   ├── auth/
│   ├── group/
│   └── medication/
└── shared/                # 共有リソース
    ├── components/ui/     # UIコンポーネント
    ├── lib/              # ユーティリティ
    └── hooks/            # カスタムフック

convex/
├── schema.ts             # スキーマ定義
├── auth/                 # 認証関連
├── groups/              # グループ関連
│   ├── queries.ts
│   ├── mutations.ts
│   └── index.ts
└── medications/         # 服薬記録関連
    ├── records/
    │   ├── queries.ts
    │   ├── mutations.ts
    │   └── index.ts
    └── history/
```

### パス解決
- **エイリアス**: `@/*` → `./src/*`
- **Convex API**: `@/shared/lib/convex` 経由で統一的にインポート

---

## 命名規則

### ファイル名

**拡張子で種別を判別**できる命名規則を採用。Biome の `useFilenamingConvention` で自動強制。

| 種別 | パターン | 例 |
|------|----------|-----|
| コンポーネント | **PascalCase.tsx** | `CartButton.tsx`, `MedicationRecorder.tsx` |
| hooks | **use-kebab-case.ts** | `use-cart-items.ts`, `use-onboarding-flow.ts` |
| ユーティリティ | **kebab-case.ts** | `format-price.ts`, `date-utils.ts` |
| 型定義 | **types.ts** | `types.ts`（フォルダごとに1ファイル） |
| 定数 | **constants.ts** | `constants.ts` |
| @x/公開API | **依存先名.ts** | `checkout.ts`, `order.ts` |
| テストファイル | **kebab-case.test.tsx** | `cart-button.test.tsx` |
| フォルダ | **kebab-case** | `cart-summary/`, `medication-record/` |

**判別ルール**:
```
.tsx + PascalCase → コンポーネント
.ts + use-* → hooks
.ts + kebab-case → ユーティリティ
```

**例外（命名規則適用外）**:
- Next.js 規約ファイル: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`
- 特殊ファイル: `index.ts`, `schema.ts`, `middleware.ts`, `*.config.ts`
- **shadcn/ui コンポーネント**: `components/ui/*`（`shadcn add` で生成されるため）

### コード内の命名
| 種類 | 規則 | 例 |
|------|------|-----|
| コンポーネント | PascalCase | `MedicationRecorder` |
| 関数/変数 | camelCase | `getTodayRecords`, `userId` |
| 定数 | UPPER_SNAKE_CASE | `MAX_GROUP_MEMBERS` |
| 型/インターフェース | PascalCase | `MedicationRecorderProps` |
| Convex関数 | camelCase | `createGroup`, `getTodayRecords` |

---

## Reactコンポーネント

### Server/Client分離

#### Server Component（デフォルト）
```typescript
// src/app/(authenticated)/dashboard/page.tsx
import { Card } from "@/shared/components/ui/card";

export default function DashboardPage() {
  return (
    <div>
      <Card>...</Card>
    </div>
  );
}
```

#### Client Component
```typescript
// src/features/medication/components/medication-recorder.tsx
"use client";

import { useQuery } from "convex/react";
import { toast } from "sonner";

import { api } from "@/shared/lib/convex";

export function MedicationRecorder({ groupId }: MedicationRecorderProps) {
  const records = useQuery(api.medications.getTodayRecords, { groupId });
  // ...
}
```

**ルール**:
- `"use client"` はファイルの最初に配置（すべてのインポートより前）
- フック（`useState`, `useQuery`, `useMutation` など）を使う場合は Client Component
- データフェッチのみの場合は Server Component を優先

### Props型定義

**必須パターン**:
```typescript
// Props型は常にコンポーネント定義の直前に定義
interface MedicationRecorderProps {
  groupId: Id<"groups">;
}

export function MedicationRecorder({ groupId }: MedicationRecorderProps) {
  // ...
}
```

**children を含む場合**:
```typescript
interface LayoutProps {
  children: React.ReactNode;
}

// Readonlyで包装（ページ/レイアウトの場合）
export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div>{children}</div>;
}
```

### エクスポート方法

**名前付きエクスポート**（推奨）:
```typescript
export function MedicationRecorder({ groupId }: MedicationRecorderProps) {
  // ...
}
```

**デフォルトエクスポート**（ページ/レイアウトのみ）:
```typescript
export default function DashboardPage() {
  // ...
}
```

---

## Convex関数

### 基本パターン

#### Query
```typescript
/**
 * 指定日の服薬記録を取得
 */
export const getTodayRecords = query({
  args: {
    groupId: v.id("groups"),
    scheduledDate: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. 認証確認
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("認証が必要です");
    }

    // 2. データ取得
    const records = await ctx.db
      .query("medicationRecords")
      .withIndex("by_groupId_scheduledDate", (q) =>
        q.eq("groupId", args.groupId).eq("scheduledDate", args.scheduledDate),
      )
      .collect();

    return records;
  },
});
```

#### Mutation
```typescript
/**
 * 服薬記録を作成
 */
export const recordSimpleMedication = mutation({
  args: {
    groupId: v.id("groups"),
    timing: v.union(
      v.literal("morning"),
      v.literal("noon"),
      v.literal("evening"),
      v.literal("bedtime"),
      v.literal("asNeeded"),
    ),
    scheduledDate: v.string(),
    simpleMedicineName: v.optional(v.string()),
    status: v.union(v.literal("taken"), v.literal("skipped")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. 認証確認
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("認証が必要です");
    }

    // 2. 権限確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), args.groupId))
      .first();

    if (!membership) {
      throw new Error("このグループのメンバーではありません");
    }

    // 3. 入力検証
    if (!args.simpleMedicineName) {
      throw new Error("薬剤名が必要です");
    }

    // 4. データ作成
    const recordId = await ctx.db.insert("medicationRecords", {
      groupId: args.groupId,
      timing: args.timing,
      scheduledDate: args.scheduledDate,
      // ...
    });

    return recordId;
  },
});
```

### Args検証

**Union型で列挙値を制約**:
```typescript
args: {
  role: v.union(v.literal("patient"), v.literal("supporter")),
  timing: v.union(
    v.literal("morning"),
    v.literal("noon"),
    v.literal("evening"),
    v.literal("bedtime"),
    v.literal("asNeeded"),
  ),
}
```

**オプショナル引数**:
```typescript
args: {
  description: v.optional(v.string()),
  notes: v.optional(v.string()),
}
```

### ファイル分割

機能ごとにディレクトリを作成し、`queries.ts`, `mutations.ts`, `index.ts` で整理:

```typescript
// convex/groups/index.ts
export { createGroup, updateGroup } from "./mutations";
export { getUserGroupStatus, getGroupMembers } from "./queries";
```

---

## エラーハンドリング

### Convex側

**検証順序**: 認証 → 権限 → 入力検証 → ビジネスロジック

```typescript
handler: async (ctx, args) => {
  // 1. 認証確認
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("認証が必要です");
  }

  // 2. 権限確認
  const membership = await ctx.db
    .query("groupMembers")
    .filter((q) => q.eq(q.field("groupId"), args.groupId))
    .first();

  if (!membership) {
    throw new Error("このグループのメンバーではありません");
  }

  // 3. 入力検証
  if (!args.name || args.name.trim() === "") {
    throw new Error("グループ名は必須です");
  }

  // 4. ビジネスロジック
  // ...
}
```

### クライアント側

**try-catch + toast**:
```typescript
const [isLoading, setIsLoading] = useState(false);
const createGroup = useMutation(api.groups.createGroup);

const handleSubmit = async (values: FormSchema) => {
  setIsLoading(true);
  try {
    await createGroup({
      name: values.groupName.trim(),
      description: values.groupDescription?.trim() || undefined,
    });

    toast.success("グループを作成しました！");
    form.reset();
    onOpenChange(false);
  } catch (error) {
    toast.error(
      error instanceof Error
        ? error.message
        : "グループの作成に失敗しました"
    );
  } finally {
    setIsLoading(false);
  }
};
```

**認証エラーの詳細処理**:
```typescript
try {
  await signIn("password", formData);
  // ...
} catch (error: unknown) {
  const errorMessage =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : String(error);

  if (errorMessage.includes("InvalidAccountId")) {
    setError("メールアドレスまたはパスワードが正しくありません");
  } else if (errorMessage.includes("InvalidPassword")) {
    setError("パスワードが正しくありません");
  } else {
    setError("ログインに失敗しました。もう一度お試しください。");
  }
}
```

---

## 非同期処理

### クライアント側

#### useQuery パターン
```typescript
const records = useQuery(api.medications.getTodayRecords, {
  groupId,
  scheduledDate: today,
});

// ローディング中の判定
if (records === undefined) {
  return <Skeleton />; // スケルトン表示
}

// データ表示
return <div>{records.map(...)}</div>;
```

#### useMutation パターン
```typescript
const [isSubmitting, setIsSubmitting] = useState(false);
const createMutation = useMutation(api.medications.create);

const handleSubmit = async (values: FormSchema) => {
  setIsSubmitting(true);
  try {
    await createMutation(values);
    toast.success("作成しました");
  } catch (error) {
    toast.error(
      error instanceof Error ? error.message : "作成に失敗しました"
    );
  } finally {
    setIsSubmitting(false);
  }
};
```

### Convex側

#### 複数クエリの並列処理
```typescript
// Promise.allで並列実行
const groups = await Promise.all(
  memberships.map(async (membership) => {
    const group = await ctx.db.get(membership.groupId);
    return {
      groupId: membership.groupId,
      groupName: group?.name,
      role: membership.role,
    };
  }),
);
```

#### 順次処理
```typescript
// 依存関係がある場合は順次実行
const user = await ctx.db.get(userId);
const membership = await ctx.db
  .query("groupMembers")
  .filter((q) => q.eq(q.field("userId"), user.id))
  .first();
```

---

## コメント

### JSDocコメント

**すべての公開関数にJSDocを記述**:
```typescript
/**
 * 新しいグループを作成
 */
export const createGroup = mutation({
  // ...
});

/**
 * 指定日の服薬記録を取得
 */
export const getTodayRecords = query({
  // ...
});
```

### 処理ステップのコメント

**複雑な処理は番号付きコメントで段階を明示**:
```typescript
handler: async (ctx, args) => {
  // 1. 認証確認
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("認証が必要です");
  }

  // 2. ユーザー情報を取得
  const user = await ctx.db.get(userId);
  if (!user) {
    return null;
  }

  // 3. メンバーシップを取得
  const memberships = await ctx.db
    .query("groupMembers")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();

  // 4. グループ詳細を取得
  const groups = await Promise.all(
    memberships.map(async (membership) => {
      const group = await ctx.db.get(membership.groupId);
      return { groupId: membership.groupId, groupName: group?.name };
    }),
  );

  return { user, groups };
};
```

### インラインコメント

**処理の意図を簡潔に説明**:
```typescript
// グループメンバーか確認
const membership = await ctx.db
  .query("groupMembers")
  .withIndex("by_userId", (q) => q.eq("userId", userId))
  .first();

// 患者を先頭に表示
members.sort((a, b) => {
  if (a.role === "patient" && b.role !== "patient") return -1;
  if (a.role !== "patient" && b.role === "patient") return 1;
  return 0;
});
```

---

## インポート

### インポート順序

1. 外部ライブラリ（Convex, React関連）
2. UIコンポーネント（`@/shared/components/ui/*`）
3. ユーティリティ（`@/shared/lib/*`, `@/shared/hooks/*`）
4. ローカルコンポーネント・型

```typescript
// 1. 外部ライブラリ
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

// 2. UIコンポーネント
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";

// 3. ユーティリティ
import type { Id } from "@/shared/lib/convex";
import { api } from "@/shared/lib/convex";
import { formatJST, nowJST } from "@/shared/lib/date-fns";

// 4. ローカル
import type { MedicationTiming } from "../types/timing";
import { MemberCard } from "./member-card";
```

### 型インポート

**`import type` で明示的に分離**:
```typescript
import type { FunctionReturnType } from "convex/server";
import type { Id } from "@/shared/lib/convex";
import type { MedicationTiming } from "../types/timing";
```

### API参照の標準化

**`@/shared/lib/convex` 経由で統一的にインポート**:
```typescript
// ✅ 推奨
import { api } from "@/shared/lib/convex";
import type { Doc, Id } from "@/shared/lib/convex";

// ❌ 非推奨
import { api } from "../../../convex/_generated/api";
```

---

## UI/UXパターン

### ローディング状態

#### Suspense境界
```typescript
// src/app/(authenticated)/layout.tsx
<Suspense fallback={<div>読み込み中...</div>}>
  {children}
</Suspense>
```

#### useQuery のローディング
```typescript
const data = useQuery(api.groups.getAll);

if (data === undefined) {
  return <Skeleton />;
}

return <div>{data.map(...)}</div>;
```

#### useMutation のローディング
```typescript
const [isLoading, setIsLoading] = useState(false);

<Button disabled={isLoading}>
  {isLoading ? "送信中..." : "送信"}
</Button>
```

### トースト通知

```typescript
// 成功
toast.success("グループを作成しました！");

// エラー
toast.error("グループの作成に失敗しました");

// エラーオブジェクトから
toast.error(
  error instanceof Error ? error.message : "操作に失敗しました"
);
```

---

## テスト（TODO）

> **注記**: テスト戦略は現在策定中です。

---

## チェックリスト

新しいコードを追加する際は、以下を確認してください：

- [ ] `any` 型を使用していないか
- [ ] すべての公開関数にJSDocコメントを記述したか
- [ ] エラーハンドリングを適切に実装したか（認証→権限→検証の順）
- [ ] 型インポートに `import type` を使用したか
- [ ] コンポーネントのProps型を定義したか
- [ ] 非同期処理でローディング状態を管理しているか
- [ ] ユーザー向けメッセージが日本語になっているか
- [x] Biomeでフォーマット・リントを実行したか → **pre-commit hook で自動実行**

---

## 参考資料

- [Biome公式ドキュメント](https://biomejs.dev/)
- [Convex公式ドキュメント](https://docs.convex.dev/)
- [Next.js App Router](https://nextjs.org/docs/app)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
