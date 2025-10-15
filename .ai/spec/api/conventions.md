# API設計規約

**最終更新**: 2025年10月16日

## 概要
本ドキュメントではConvex APIの設計規約を定義します。すべてのQuery/Mutation/Action関数はこれらの規約に従います。

---

## Convex関数の種類

### Query（データ取得）
- **用途**: データベースからのデータ読み取り
- **特徴**: リアクティブ（データ変更時に自動再実行）
- **制約**: 副作用禁止（データ変更不可）

### Mutation（データ更新）
- **用途**: データベースへのデータ書き込み
- **特徴**: トランザクション保証
- **制約**: 外部API呼び出し不可

### Action（外部連携）
- **用途**: 外部APIとの連携、複数回の試行ロジック
- **特徴**: 外部API呼び出し可能
- **制約**: 非トランザクション

---

## 命名規約

### ファイル構成
```
convex/
└── [feature]/
    ├── index.ts          # エントリーポイント（re-exports）
    ├── queries.ts        # Query関数
    ├── mutations.ts      # Mutation関数
    ├── actions.ts        # Action関数（必要時）
    └── __tests__/        # テストファイル
```

### 関数名パターン

**Query**:
- `get[Entity]`: 単一エンティティ取得 (`getCurrentUser`)
- `list[Entities]`: 複数エンティティ取得 (`listGroupInvitations`)
- `validate[Entity]`: バリデーション (`validateInvitationCode`)

**Mutation**:
- `create[Entity]`: 作成 (`createGroup`)
- `update[Entity]`: 更新 (`updateMedicationRecord`)
- `delete[Entity]`: 削除 (`deleteMedicationRecord`)
- `join[Entity]`: 参加 (`joinGroup`)
- `record[Action]`: 記録 (`recordSimpleMedication`)

**Action**:
- `[verb][Entity]Action`: アクション (`generateInvitationCodeAction`)
- 内部処理は `[verb][Entity]Internal` (mutation)

---

## 認証パターン

### 必須認証
```typescript
import { getAuthUserId } from "@convex-dev/auth/server";

export const someFunction = mutation({
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("認証が必要です");
    }
    // 処理続行
  },
});
```

### 任意認証（ログイン状態で挙動変更）
```typescript
export const getCurrentUser = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null; // 未認証時はnull返却
    }
    // 認証済みユーザー情報返却
  },
});
```

---

## 認可パターン

### グループメンバーシップ確認
```typescript
// パターン1: 基本的なメンバーシップ確認
const membership = await ctx.db
  .query("groupMembers")
  .withIndex("by_userId", (q) => q.eq("userId", userId))
  .filter((q) => q.eq(q.field("groupId"), args.groupId))
  .first();

if (!membership) {
  throw new Error("このグループのメンバーではありません");
}
```

### ロールベース確認
```typescript
// パターン2: 特定ロールのみ許可
if (!["patient", "owner"].includes(membership.role)) {
  throw new Error("権限がありません");
}
```

### リソース所有者確認
```typescript
// パターン3: 作成者のみ許可
const resource = await ctx.db.get(resourceId);
if (resource.createdBy !== userId) {
  throw new Error("この操作を実行する権限がありません");
}
```

---

## バリデーションパターン

### 引数バリデーション（Zodスキーマ）
```typescript
export const createGroup = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    creatorRole: v.union(v.literal("patient"), v.literal("supporter")),
  },
  handler: async (ctx, args) => {
    // 追加バリデーション
    if (!args.name || args.name.trim().length === 0) {
      throw new Error("名前を入力してください");
    }
    
    if (args.name.length > 50) {
      throw new Error("名前は50文字以内で入力してください");
    }
    
    // 処理続行
  },
});
```

### 重複チェック
```typescript
const existing = await ctx.db
  .query("groupInvitations")
  .withIndex("by_code", (q) => q.eq("code", args.code))
  .first();

if (existing) {
  throw new Error("招待コードが重複しています");
}
```

### ビジネスルールバリデーション
```typescript
// 例: グループ内に患者は1人のみ
const existingPatient = await ctx.db
  .query("groupMembers")
  .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
  .filter((q) => q.eq(q.field("role"), "patient"))
  .first();

if (existingPatient) {
  throw new Error("このグループには既に患者が登録されています");
}
```

---

## エラーハンドリング

### エラーメッセージ原則
- **具体的**: 何が問題か明確に
- **解決策提示**: 可能な限り次のアクションを示す
- **ユーザーフレンドリー**: 技術用語を避ける

### エラー例
```typescript
// ✅ 良い例
throw new Error("表示名は50文字以内で入力してください");
throw new Error("このグループのメンバーではありません");
throw new Error("招待コードが無効です");

// ❌ 悪い例
throw new Error("Invalid input");
throw new Error("Error: NullPointerException");
throw new Error("エラーが発生しました");
```

### エラータイプ別処理
```typescript
// 認証エラー
if (!userId) throw new Error("認証が必要です");

// 認可エラー
if (!membership) throw new Error("このグループのメンバーではありません");

// バリデーションエラー
if (!args.name) throw new Error("名前は必須です");

// リソース不存在エラー
if (!group) throw new Error("グループが見つかりません");

// ビジネスルールエラー
if (invitation.isUsed) throw new Error("招待コードが無効です");
```

---

## データアクセスパターン

### インデックス活用
```typescript
// ✅ インデックス使用（高速）
const members = await ctx.db
  .query("groupMembers")
  .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
  .collect();

// ❌ フルスキャン（低速・非推奨）
const members = await ctx.db
  .query("groupMembers")
  .filter((q) => q.eq(q.field("groupId"), args.groupId))
  .collect();
```

### 関連データ取得
```typescript
// パターン: Promise.allで並列取得
const membersWithInfo = await Promise.all(
  members.map(async (member) => {
    const user = await ctx.db.get(member.userId);
    return {
      userId: member.userId,
      displayName: user?.displayName,
      role: member.role,
    };
  }),
);
```

---

## タイムスタンプ管理

### 作成時
```typescript
const now = Date.now();

await ctx.db.insert("groups", {
  name: args.name,
  createdBy: userId,
  createdAt: now,
});
```

### 更新時
```typescript
const now = Date.now();

await ctx.db.patch(recordId, {
  status: args.status,
  updatedAt: now,
});
```

### 有効期限設定
```typescript
const now = Date.now();
const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
const expiresAt = now + sevenDaysInMs;
```

---

## 履歴管理パターン

### 更新前に履歴保存
```typescript
// 1. 現在のレコードを履歴に保存
await ctx.db.insert("medicationRecordsHistory", {
  originalRecordId: args.recordId,
  ...record, // 既存データコピー
  historyType: "updated",
  archivedAt: now,
  archivedBy: userId,
});

// 2. 元のレコードを更新
await ctx.db.patch(args.recordId, updateData);
```

### 削除前に履歴保存
```typescript
// 1. 履歴テーブルに保存
await ctx.db.insert("medicationRecordsHistory", {
  originalRecordId: args.recordId,
  ...record,
  historyType: "deleted",
  archivedAt: now,
  archivedBy: userId,
});

// 2. 元のレコードを削除
await ctx.db.delete(args.recordId);
```

---

## Action-Mutation連携パターン

### リトライロジック（Action）
```typescript
export const createInvitation = action({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    const maxAttempts = 3;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const code = await ctx.runAction(
        api.invitationCodeGenerator.generateInvitationCodeAction
      );
      
      try {
        return await ctx.runMutation(
          api.invitations.createInvitationInternal,
          { groupId: args.groupId, code }
        );
      } catch (error) {
        if (error instanceof Error && error.message.includes("重複")) {
          continue; // 重複時は再試行
        }
        throw error;
      }
    }
    
    throw new Error("招待コードの生成に失敗しました");
  },
});
```

### 内部Mutation（トランザクション保証）
```typescript
export const createInvitationInternal = mutation({
  args: { groupId: v.id("groups"), code: v.string() },
  handler: async (ctx, args) => {
    // 認証・認可・バリデーション
    // データベース操作
    return result;
  },
});
```

---

## レスポンス形式

### 成功時
```typescript
// 単一エンティティ
return { userId, displayName, role };

// リスト
return membersWithInfo; // 配列

// 作成操作
return groupId; // ID返却

// 更新・削除操作
return { success: true };
```

### バリデーション結果
```typescript
// 判定結果 + データ
return {
  valid: true as const,
  invitation: { /* データ */ },
};

// 判定結果 + エラー
return {
  valid: false as const,
  error: "招待コードが無効です",
};
```

---

## 関連ドキュメント

- [プロジェクト概要](../../context/project.md)
- [アーキテクチャ](../../context/architecture.md)
- [エラーハンドリング](../../context/error-handling.md)
- [テスト戦略](../../context/testing-strategy.md)
