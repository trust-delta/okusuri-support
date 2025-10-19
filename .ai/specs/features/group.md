# グループ管理機能仕様

**最終更新**: 2025年10月19日

## 概要

患者と支援者が協働で服薬管理を行うためのグループ機能。招待コード/リンクによるメンバー追加に対応。

**複数グループ対応**: ユーザーは複数のグループに所属でき、アクティブグループを切り替えて使用可能。

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

## 複数グループ管理

### アクティブグループの概念

- **activeGroupId**: `users`テーブルに保存され、現在アクティブなグループを管理
- **自動設定**: グループ作成・参加時に自動的に新しいグループがアクティブに設定
- **フォールバック**: 未設定の場合、所属グループの最初のものを使用

### グループ切り替え

**UI**: ダッシュボードヘッダーのドロップダウン

**フロー**:
```
1. ユーザーがドロップダウンから別グループを選択
2. setActiveGroup mutationを呼び出し
3. users.activeGroupIdを更新
4. ページをリロードして新グループのデータを表示
```

**API**: `users.setActiveGroup`
```typescript
{
  args: { groupId: Id<"groups"> },
  returns: { success: boolean }
}
```

---

## 機能

### 1. グループ作成

**フロー**:
```
1. ユーザーがグループ名・説明・役割を入力
2. groupsテーブルに新規作成
3. groupMembersに作成者を追加（role: 入力された役割）
4. users.activeGroupIdを新グループに設定
5. グループIDを返却
```

**API**: `groups.mutations.create`
```typescript
{
  args: { 
    name: string, 
    description?: string, 
    creatorRole: "patient" | "supporter" 
  },
  returns: Id<"groups">
}
```

### 2. グループ状態取得

**フロー**:
```
1. 認証ユーザーのuserIdを取得
2. usersテーブルからactiveGroupIdを取得
3. groupMembersから所属グループ一覧を検索
4. グループ情報とactiveGroupIdを返却
```

**API**: `groups.queries.getUserGroupStatus`
```typescript
{
  args: {},
  returns: {
    hasGroup: boolean,
    groups: Array<{
      groupId: Id<"groups">,
      groupName?: string,
      role: "patient" | "supporter",
      joinedAt: number,
    }>,
    activeGroupId?: Id<"groups">
  }
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
5. users.activeGroupIdを新グループに設定
6. groupInvitationsのisUsedをtrueに更新
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

### ダッシュボード (`/dashboard`)
- **グループ切り替え**: ヘッダーのドロップダウンで所属グループを切り替え
- **グループ作成**: ドロップダウン横の「＋」ボタンからグループ作成ダイアログを表示
- **アクティブグループ情報**: 選択中のグループ名と役割を表示

### グループ作成ダイアログ
- グループ名・説明・役割入力フォーム
- ダイアログ形式（モーダル）
- 作成後に自動的に新グループに切り替え

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

- **所属グループ数上限**: なし
- **メンバー数上限**: なし（将来的に検討）
- **招待コード有効期限**: 7日間（固定）
- **招待コード再利用**: 不可（使用後は無効化）
- **権限管理**: 未実装（全メンバー同等権限）
- **Patient role制約**: 1グループに1人のPatientのみ（既存仕様を維持）

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
