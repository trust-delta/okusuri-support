# グループ管理機能仕様

**最終更新**: 2025年10月16日

## 概要

患者と支援者が協働で服薬管理を行うためのグループ機能。招待コード/リンクによるメンバー追加に対応。

---

## データモデル

### groups テーブル

```typescript
{
  _id: Id<"groups">,
  name: string,
  description?: string,
  createdBy: string,          // Convex Auth userId
  createdAt: number,
}
```

### groupMembers テーブル

```typescript
{
  _id: Id<"groupMembers">,
  groupId: Id<"groups">,
  userId: string,             // Convex Auth userId
  role: "patient" | "supporter",
  joinedAt: number,
}
```

**インデックス**:
- `by_userId`: ユーザーが所属するグループ検索
- `by_groupId`: グループ内メンバー一覧

### groupInvitations テーブル

```typescript
{
  _id: Id<"groupInvitations">,
  code: string,               // 8文字英数字（一意）
  groupId: Id<"groups">,
  createdBy: string,          // userId
  createdAt: number,
  expiresAt: number,          // createdAt + 7日
  allowedRoles: ("patient" | "supporter")[],
  isUsed: boolean,
  usedBy?: string,            // userId
  usedAt?: number,
}
```

**インデックス**:
- `by_code`: 招待コード検索（一意）
- `by_groupId`: グループ別招待一覧
- `by_groupId_isUsed`: 有効招待フィルタリング

---

## 機能

### 1. グループ作成

**フロー**:
```
1. ユーザーがグループ名・説明を入力
2. groupsテーブルに新規作成
3. groupMembersに作成者を追加（role: 最初の選択による）
4. グループIDを返却
```

**API**: `groups.mutations.create`
```typescript
{
  args: { name: string, description?: string, initialRole: "patient" | "supporter" },
  returns: Id<"groups">
}
```

### 2. グループ一覧取得

**フロー**:
```
1. 認証ユーザーのuserIdを取得
2. groupMembersから所属グループを検索
3. グループ情報を返却
```

**API**: `groups.queries.list`
```typescript
{
  args: {},
  returns: Array<{
    _id: Id<"groups">,
    name: string,
    description?: string,
    role: "patient" | "supporter",
    memberCount: number,
  }>
}
```

### 3. グループ詳細取得

**API**: `groups.queries.get`
```typescript
{
  args: { groupId: Id<"groups"> },
  returns: {
    _id: Id<"groups">,
    name: string,
    description?: string,
    createdBy: string,
    createdAt: number,
    members: Array<{
      userId: string,
      displayName?: string,
      role: "patient" | "supporter",
      joinedAt: number,
    }>,
  }
}
```

### 4. グループ編集

**API**: `groups.mutations.update`
```typescript
{
  args: { groupId: Id<"groups">, name?: string, description?: string },
  returns: void
}
```

**権限**: グループメンバーのみ

### 5. グループ削除

**API**: `groups.mutations.remove`
```typescript
{
  args: { groupId: Id<"groups"> },
  returns: void
}
```

**権限**: グループ作成者のみ（将来的にオーナー権限で制御）

---

## 招待機能

### 1. 招待コード生成

**フロー**:
```
1. 8文字英数字ランダム生成
2. 一意性チェック（重複時は再生成）
3. groupInvitationsに保存
4. 有効期限: 作成日時 + 7日
```

**API**: `invitations.mutations.create`
```typescript
{
  args: {
    groupId: Id<"groups">,
    allowedRoles: ("patient" | "supporter")[],
  },
  returns: {
    code: string,
    expiresAt: number,
  }
}
```

**招待コード形式**: `ABC12XYZ` (8文字、大文字英数字)

### 2. 招待リンク生成

**形式**: `https://yourdomain.com/invite/{code}`

**フロントエンド**: `/invite/[code]/page.tsx`

### 3. 招待受諾

**フロー**:
```
1. 招待コード検証（存在・有効期限・未使用）
2. ユーザー認証確認
3. ロール選択（allowedRolesから）
4. groupMembersに追加
5. groupInvitationsのisUsedをtrueに更新
```

**API**: `invitations.mutations.accept`
```typescript
{
  args: {
    code: string,
    selectedRole: "patient" | "supporter",
  },
  returns: Id<"groups">
}
```

**エラーケース**:
- コード不正: "招待コードが無効です"
- 有効期限切れ: "招待コードの有効期限が切れました"
- 既に使用済み: "この招待コードは既に使用されています"
- 既にメンバー: "既にグループに参加しています"

### 4. 招待一覧取得

**API**: `invitations.queries.list`
```typescript
{
  args: { groupId: Id<"groups"> },
  returns: Array<{
    _id: Id<"groupInvitations">,
    code: string,
    createdAt: number,
    expiresAt: number,
    allowedRoles: ("patient" | "supporter")[],
    isUsed: boolean,
    usedBy?: string,
    usedAt?: number,
  }>
}
```

---

## UI実装

### グループ一覧 (`/dashboard`)
- 所属グループのカード表示
- グループ作成ボタン

### グループ作成 (`/groups/new`)
- グループ名・説明入力フォーム

### グループ詳細 (`/groups/[id]`)
- グループ情報表示
- メンバー一覧
- 招待ボタン

### 招待モーダル
- 招待コード表示
- 招待リンクコピーボタン
- QRコード表示（将来）

### 招待ページ (`/invite/[code]`)
- 招待情報表示（グループ名）
- ロール選択
- 参加ボタン

---

## 制限事項

- **メンバー数上限**: なし（将来的に検討）
- **招待コード有効期限**: 7日間（固定）
- **招待コード再利用**: 不可（使用後は無効化）
- **権限管理**: 未実装（全メンバー同等権限）

---

## テスト

### ユニットテスト
- 招待コード生成（一意性）
- 有効期限計算

### 統合テスト
- グループCRUD操作
- 招待フロー全体

### E2Eテスト
- グループ作成→招待→参加フロー

---

## 関連ドキュメント

- [認証機能](auth.md)
- [服薬管理](medication.md)
- [アーキテクチャ](../../context/architecture.md)
