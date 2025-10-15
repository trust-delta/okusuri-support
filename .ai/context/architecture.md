# アーキテクチャ

**最終更新**: 2025年10月16日

## 概要

Feature-Based Architecture（機能ベース）を採用したフルスタックTypeScriptアプリケーション。Next.js 15（App Router）+ Convex（BaaS）によるリアルタイム同期とサーバーレス構成。

---

## システムアーキテクチャ

```
┌─────────────────────────────────┐
│      クライアント (Next.js)      │
│   Pages → Features → Components │
└────────────┬────────────────────┘
             │ WebSocket
             ▼
┌─────────────────────────────────┐
│        Convex (Backend)         │
│  Queries / Mutations / Actions  │
│              ↓                  │
│     Convex Database (NoSQL)     │
└─────────────────────────────────┘
```

---

## アーキテクチャ原則

### 1. Feature-Based Architecture

機能ごとに独立したモジュールとして実装。

```
src/features/
├── auth/          # 認証（components/hooks/__tests__）
├── group/         # グループ管理
├── medication/    # 服薬管理
└── onboarding/    # オンボーディング
```

**原則**:
- 各機能は他機能に依存しない
- `index.ts`でPublic APIを管理
- 内部関数は`_`プレフィックス

### 2. リアルタイムファースト

Convex Reactive Queriesによる自動同期。

```typescript
// フロントエンド
const groups = useQuery(api.groups.queries.list)
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
  }).index("by_owner", ["ownerId"])
})
```

### 4. Progressive Enhancement

- PWA対応（オフライン/インストール可能）
- Server Components優先
- Code Splitting（動的インポート）

---

## レイヤードアーキテクチャ

### プレゼンテーション層
- **場所**: `src/app/`, `src/features/*/components/`
- **責務**: UI、ルーティング、ユーザー入力
- **技術**: Next.js App Router、React Server/Client Components

### ビジネスロジック層
- **場所**: `src/features/*/hooks/`, `convex/*/`
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
users (1) ─── (n) groups (1) ─── (n) group_users
  │                  │
  │ (1)              │ (1)
  │                  │
  │ (n)              │ (n)
  ▼                  ▼
medications      invitations
```

### 主要テーブル

**users**
```typescript
{ _id, email, name?, role: "patient" | "supporter", createdAt }
```

**groups**
```typescript
{ _id, name, ownerId, createdAt }
```

**group_users**
```typescript
{ _id, groupId, userId, role: "owner" | "admin" | "member", joinedAt }
```

**invitations**
```typescript
{ _id, groupId, code, expiresAt, createdBy, maxUses?, usedCount }
```

---

## 認証・認可

### 認証フロー

```
Client → Convex Auth → Resend (OTP Email) → JWT Token
```

### 認可（RBAC）

| 操作 | patient | supporter | admin | owner |
|------|---------|-----------|-------|-------|
| 自分の服薬記録作成 | ✅ | ✅ | ✅ | ✅ |
| 他人の記録閲覧 | ❌ | ✅ | ✅ | ✅ |
| メンバー追加 | ❌ | ❌ | ✅ | ✅ |
| グループ設定変更 | ❌ | ❌ | ✅ | ✅ |
| グループ削除 | ❌ | ❌ | ❌ | ✅ |

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
const groups = useQuery(api.groups.queries.list)
const createGroup = useMutation(api.groups.mutations.create)
```

### ローカル状態（React Hooks）
```typescript
const [isOpen, setIsOpen] = useState(false)
```

### フォーム状態（React Hook Form）
```typescript
const form = useForm({ resolver: zodResolver(schema) })
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
- [技術スタック](tech-stack.md)
- [テスト戦略](testing-strategy.md)
- [エラーハンドリング](error-handling.md)
