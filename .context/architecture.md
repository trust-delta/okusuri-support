# アーキテクチャ

**最終更新**: 2026年01月11日

## 概要

Feature-Based Architecture（機能ベース）を採用したフルスタックTypeScriptアプリケーション。Next.js 15（App Router）+ Convex（BaaS）によるリアルタイム同期とサーバーレス構成。

---

## システムアーキテクチャ

```
┌─────────────┐     ┌──────────────┐
│  Next.js 15 │────▶│ Convex Auth  │
│  (Frontend) │     │(authenticate)│
└──────┬──────┘     └──────────────┘
       │ WebSocket
       ▼
┌─────────────┐     ┌─────────────┐
│   Convex    │────▶│   Resend    │
│ (Backend)   │     │   (Email)   │
└─────────────┘     └─────────────┘
```

---

## アーキテクチャ原則

### 1. Feature-Based Architecture

機能ごとに独立したモジュールとして実装。**フラット構造**を採用し、命名規則でファイル種別を判別。

```
app/_shared/features/
├── auth/               # 認証
│   ├── AuthPageLayout.tsx      # コンポーネント (PascalCase.tsx)
│   ├── OauthSignIn.tsx
│   ├── use-redirect-after-auth.ts  # フック (use-kebab-case.ts)
│   ├── index.ts                # Public API
│   └── __tests__/              # テストファイル
├── group/              # グループ管理
├── medication/         # 服薬管理
└── push-notifications/ # プッシュ通知
```

**原則**:

- 各機能は基本的に独立（現在 feature 間の依存なし）
- ファイルは feature ルートに直接配置（`hooks/`, `components/` サブディレクトリ不要）
- テストは `__tests__/` ディレクトリに分離
- `index.ts` で Public API を管理
- 将来 feature 間依存が発生した場合は **`@x/` ディレクトリ**で明示的に管理

### @x/ ディレクトリによる依存管理（将来用）

feature 間の依存が発生した場合に使用。**依存される側が公開先を宣言**するパターン（FSD由来）。

```
app/_shared/features/
├── cart/
│   ├── CartButton.tsx
│   ├── use-cart-items.ts
│   └── @x/
│       ├── checkout.ts    ← checkout向け公開API
│       └── order.ts       ← order向け公開API
│
└── checkout/
    ├── CheckoutForm.tsx
    └── (cart/@x/checkout.ts をインポート可能)
```

**ルール**:
- feature 間の依存は `@x/依存先名.ts` 経由でのみ許可
- `ls @x/` で依存先が一覧できる
- `grep "@x/checkout"` で影響範囲が即わかる
- ファイル削除 = 依存解除

**公開先ごとに別ファイル**（中身が同じでも）:
```typescript
// @x/order.ts（orderには全部公開）
export { getCartItems, getCartTotal } from '../use-cart-items'

// @x/checkout.ts（checkoutには一部だけ）
export { getCartItems } from '../use-cart-items'
```

> **現状**: 各 feature は独立しており、@x/ ディレクトリは未使用。依存が発生した時点で導入する。

### 2. リアルタイムファースト

Convex Reactive Queriesによる自動同期。

```typescript
// フロントエンド
const groups = useQuery(api.groups.queries.list);
// データ変更が即座に全クライアントに反映される
```

### 3. 型安全性優先

TypeScript strict mode + Convex スキーマによる完全な型安全性。

```typescript
// convex/schema.ts
export default defineSchema({
  groups: defineTable({
    name: v.string(),
    ownerId: v.id("users"),
  }).index("by_owner", ["ownerId"]),
});
```

### 4. Progressive Enhancement

- PWA対応（オフライン/インストール可能）
- Server Components優先
- Code Splitting（動的インポート）

---

## レイヤードアーキテクチャ

### プレゼンテーション層

- **場所**: `app/`, `app/_shared/features/*/`（コンポーネント）
- **責務**: UI、ルーティング、ユーザー入力
- **技術**: Next.js App Router、React Server/Client Components

### ビジネスロジック層

- **場所**: `app/_shared/features/*/`（フック）, `convex/*/`
- **責務**: ビジネスルール、データ操作、バリデーション
- **技術**: カスタムReact Hooks、Convex Functions

### データアクセス層

- **場所**: `convex/schema.ts`, `convex/*/queries.ts`, `convex/*/mutations.ts`
- **責務**: データベース操作、永続化、トランザクション
- **技術**: Convex Database（NoSQL）

---

## データモデル

### 主要エンティティ

```
users (1) ─── (n) groupMembers (n) ─── (1) groups
  │                                        │
  │ (1)                                    │ (1)
  │                                        │
  │ (activeGroupId)                        │
  │                                        │
  │ (n)                                    │ (n)
  ▼                                        ▼
medicines (1) ─── (n) medicationSchedules  invitations
  │
  │ (1)
  │
  │ (n)
  ▼
medicationRecords ─── (n) medicationRecordsHistory
```

**複数グループ対応**:

- ユーザーは複数のグループに所属可能（`groupMembers`を介して多対多関係）
- `users.activeGroupId`で現在アクティブなグループを管理
- アクティブグループ未設定時は最初のグループをフォールバック

### 主要テーブル

**users** (Convex Auth管理 + カスタムフィールド)

```typescript
{
  _id,
  name?: string,
  image?: string,
  email?: string,
  emailVerificationTime?: number,
  phone?: string,
  phoneVerificationTime?: number,
  isAnonymous?: boolean,
  displayName?: string,                // ユーザー表示名（全グループ共通）
  customImageStorageId?: Id<"_storage">, // カスタムアップロード画像
  activeGroupId?: Id<"groups">         // アクティブなグループID（複数グループ対応）
}
```

**groups**

```typescript
{
  _id,
  name: string,
  description?: string,
  createdBy: string,  // Convex AuthのuserId
  createdAt: number
}
```

**groupMembers**

```typescript
{
  _id,
  groupId: Id<"groups">,
  userId: string,  // Convex AuthのuserId
  role: "patient" | "supporter",
  joinedAt: number
}
// Indexes: by_userId, by_groupId
```

**groupInvitations**

```typescript
{
  _id,
  code: string,  // 8文字英数字（一意）
  groupId: Id<"groups">,
  createdBy: string,
  createdAt: number,
  expiresAt: number,  // 作成から7日後
  allowedRoles: ("patient" | "supporter")[],
  isUsed: boolean,
  usedBy?: string,
  usedAt?: number
}
// Indexes: by_code, by_groupId, by_groupId_isUsed
```

**medicines**

```typescript
{
  _id,
  groupId: Id<"groups">,
  prescriptionId?: Id<"prescriptions">,  // 処方箋ID
  name: string,
  description?: string,
  createdBy: string,
  createdAt: number,
  deletedAt?: number,   // 論理削除日時
  deletedBy?: string    // 削除者のuserId
}
// Indexes: by_groupId, by_prescriptionId
```

**medicationSchedules**

```typescript
{
  _id,
  medicineId: Id<"medicines">,
  groupId: Id<"groups">,
  timings: ("morning" | "noon" | "evening" | "bedtime" | "asNeeded")[],
  dosage?: { amount: number, unit: string },  // 用量（数値+単位）
  notes?: string,
  createdBy: string,
  createdAt: number,
  updatedAt: number,
  deletedAt?: number,   // 論理削除日時
  deletedBy?: string    // 削除者のuserId
}
// Indexes: by_medicineId, by_groupId
```

**medicationRecords** (最新状態のみ)

```typescript
{
  _id,
  medicineId?: Id<"medicines">,
  scheduleId?: Id<"medicationSchedules">,
  simpleMedicineName?: string,  // 薬剤未登録時の表示名
  groupId: Id<"groups">,
  patientId: string,
  timing: "morning" | "noon" | "evening" | "bedtime" | "asNeeded",
  scheduledDate: string,  // YYYY-MM-DD
  takenAt?: number,
  status: "pending" | "taken" | "skipped",
  recordedBy: string,
  notes?: string,
  createdAt: number,
  updatedAt: number
}
// Indexes: by_groupId, by_patientId, by_scheduleId, by_scheduledDate,
//          by_groupId_scheduledDate, by_patientId_scheduledDate,
//          by_status, by_patientId_timing_scheduledDate
```

**medicationRecordsHistory** (削除・編集履歴)

```typescript
{
  _id,
  originalRecordId: Id<"medicationRecords">,
  // ... medicationRecordsと同じフィールド
  historyType: "deleted" | "updated",
  archivedAt: number,
  archivedBy: string
}
// Indexes: by_originalRecordId, by_groupId, by_patientId, by_archivedAt
```

---

## 認証・認可

### 認証フロー

```
Client → Convex Auth → Resend (OTP Email) → JWT Token
```

### 認可（RBAC）

| 操作               | patient | supporter |
| ------------------ | ------- | --------- |
| 自分の服薬記録作成 | ✅      | ✅        |
| 他人の記録閲覧     | ❌      | ✅        |
| メンバー追加       | ✅      | ✅        |
| グループ設定変更   | ✅      | ✅        |
| グループ削除       | ✅      | ✅        |

---

## API設計

### Convex Functions

**Query**（読み取り専用）

- 副作用なし
- リアクティブ（自動更新）
- キャッシュ可能

**Mutation**（データ更新）

- データの作成・更新・削除
- トランザクション保証
- 楽観的UI対応

**Action**（外部API連携）

- 外部APIコール可能
- 非決定的処理

---

## 状態管理

### グローバル状態（Convex）

```typescript
const groups = useQuery(api.groups.queries.list);
const createGroup = useMutation(api.groups.mutations.create);
```

### ローカル状態（React Hooks）

```typescript
const [isOpen, setIsOpen] = useState(false);
```

### フォーム状態（React Hook Form）

```typescript
const form = useForm({ resolver: zodResolver(schema) });
```

---

## セキュリティ

### 多層防御

1. **クライアント側**: バリデーション、XSS対策
2. **API層**: 認証・認可チェック
3. **データ層**: スキーマバリデーション

### データ暗号化

- **通信**: HTTPS強制
- **パスワード**: bcryptハッシング
- **JWT**: HS256署名

---

## パフォーマンス最適化

### フロントエンド

- React Server Components
- Dynamic Import
- Image Optimization（Next.js Image）
- Memoization（useMemo/useCallback）

### バックエンド

- インデックス設定
- ページネーション
- Convex自動キャッシング

---

## デプロイ構成

```
Vercel (Edge Network)
    ↓ WebSocket
Convex (Managed Service)
```

- **フロントエンド**: Vercel Edge Networkによる自動スケーリング
- **バックエンド**: Convexの自動スケーリング

---

## 関連ドキュメント

- [プロジェクト概要](project.md)
- [テスト戦略](testing-strategy.md)
- [エラーハンドリング](error-handling.md)
- [コーディング規約](coding-style.md)
