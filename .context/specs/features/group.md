# グループ管理機能仕様

**最終更新**: 2025年10月26日

## 概要

患者と支援者が協働で服薬管理を行うためのグループ機能。招待コード/リンクによるメンバー追加に対応。

**複数グループ対応**: ユーザーは複数のグループに所属でき、アクティブグループを切り替えて使用可能。

**脱退・削除機能**: メンバーはグループから脱退でき、最後の1人のみがグループを削除可能。脱退後も再参加時にデータが復元される。

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
  deletedAt?: number,         // グループ削除日時（論理削除）
  deletedBy?: string,         // 削除実行者のuserId
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
  leftAt?: number,            // 脱退日時（論理削除）
  leftBy?: string,            // 脱退実行者のuserId
}
```

**インデックス**:
- `by_userId`: ユーザーが所属するグループ検索
- `by_groupId`: グループ内メンバー一覧
- `by_groupId_leftAt`: アクティブメンバーのフィルタリング用

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

**API**: `groups.mutations.updateGroup`
```typescript
{
  args: { groupId: Id<"groups">, name?: string, description?: string },
  returns: Result<void>
}
```

**権限**: グループメンバーのみ

**バリデーション**:
- グループ名: 必須、1～100文字
- 説明: 任意、最大500文字

### 5. グループ脱退

**フロー**:
```
1. 認証ユーザーのメンバー情報を取得
2. グループの現在のアクティブメンバー数をカウント
3. メンバー数が1人の場合はエラー
4. groupMembers.leftAtに現在時刻を設定（論理削除）
5. groupMembers.leftByに現在のuserIdを設定
6. activeGroupIdが脱退したグループの場合、別のグループに自動切り替え
```

**API**: `groups.mutations.leaveGroup`
```typescript
{
  args: { groupId: Id<"groups"> },
  returns: Result<void>
}
```

**権限**: グループメンバーのみ

**エラーケース**:
- 「グループメンバーではありません」
- 「最後の1人のメンバーは脱退できません。グループを削除してください」

### 6. グループ削除

**フロー**:
```
1. 認証ユーザーのメンバー情報を取得
2. グループの現在のアクティブメンバー数をカウント
3. メンバー数が2人以上の場合はエラー
4. groups.deletedAtに現在時刻を設定（論理削除）
5. groups.deletedByに現在のuserIdを設定
6. 関連する全データを論理削除:
   - groupMembers
   - prescriptions（既存の論理削除機能を利用）
   - medicines
   - medicationSchedules
   - medicationRecords
7. activeGroupIdが削除したグループの場合、別のグループに自動切り替え
```

**API**: `groups.mutations.deleteGroup`
```typescript
{
  args: { groupId: Id<"groups"> },
  returns: Result<void>
}
```

**権限**: グループメンバーのみ（最後の1人のみ削除可能）

**エラーケース**:
- 「グループメンバーではありません」
- 「メンバーが複数いるグループは削除できません。先に脱退してください」

### 7. activeGroupId の自動切り替え

**脱退・削除後の挙動**:
```
優先順位:
1. 他に所属しているグループがあれば、最も最近参加したグループに切り替え
2. 所属グループがない場合は null に設定
3. フロントエンドでオンボーディング画面にリダイレクト
```

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

### 3. 招待受諾・再参加

**フロー**:
```
1. 招待コード検証（存在・有効期限・未使用）
2. ユーザー認証確認
3. ロール選択（allowedRolesから）
4. 既存のgroupMembersレコードを検索（leftAt != undefined）
5. 既存レコードが存在する場合（再参加）:
   - leftAt, leftByをundefinedに戻す（復元）
   - roleは新しく選択したものに更新
   - joinedAtは元の値を保持（初回参加日時）
6. 既存レコードが存在しない場合（新規参加）:
   - 新規にgroupMembersを作成
7. users.activeGroupIdを新グループに設定
8. groupInvitationsのisUsedをtrueに更新
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

**再参加時のデータ復元**:
- 脱退前の処方箋データや服薬記録がそのまま復元される
- 初回参加日時（joinedAt）も保持される
- ロールは再選択可能（patient ⇄ supporter切り替え可能）

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

### ヘッダーナビゲーション
- **グループボタン**: ヘッダーに「グループ」アイコンボタンを追加（`/group`へのリンク）
- **位置**: 処方箋管理と設定の間に配置

### ダッシュボード (`/dashboard`)
- **グループ切り替え**: ヘッダーのドロップダウンで所属グループを切り替え
- **グループ作成**: ドロップダウン横の「＋」ボタンからグループ作成ダイアログを表示
- **アクティブグループ情報**: 選択中のグループ名と役割を表示

### グループ作成ダイアログ
- グループ名・説明・役割入力フォーム
- ダイアログ形式（モーダル）
- 作成後に自動的に新グループに切り替え

### グループページ (`/group`) - **ハイブリッド型UI**

#### ヘッダーエリア
- **グループ名・説明**: 大きく表示
- **編集ボタン**: グループ情報編集ダイアログを開く
- **メンバーを招待ボタン**: 招待ダイアログを開く

#### 統計カード
- **あなたの役割**: Patient/Supporterバッジ表示
- **メンバー数**: 現在の人数
- **作成日**: グループ作成日時

#### メンバーカード
- **メンバー一覧**: アバター、名前、メール、役割バッジ
- **表示形式**: カード形式で見やすく配置

#### 招待セクション（アコーディオン）
- **アクティブな招待**: 未使用の招待リストと有効期限
- **使用済みの招待**: 使用済み招待の履歴
- **リンクコピー**: ワンクリックでコピー機能

#### 危険な操作エリア
- **グループから脱退**: 2人以上の場合のみ表示
- **グループを削除**: 最後の1人の場合のみ表示

### 編集ダイアログ
- **グループ名入力**: 必須、最大100文字
- **説明入力**: 任意、最大500文字
- **保存ボタン**: 更新処理実行

### 招待ダイアログ
- **作成前**: 「招待リンクを作成」ボタン
- **作成後**:
  - 招待コード表示（モノスペースフォント）
  - 招待リンク表示
  - コピーボタン（クリップボードへコピー）
  - 有効期限表示（7日間）

### 招待ページ (`/invite/[code]`)
- 招待情報表示（グループ名）
- ロール選択
- 参加ボタン

**確認ダイアログ**:

脱退時:
```
グループから脱退しますか?

脱退後も、再度招待されることで以前のデータを保持したまま再参加できます。

[キャンセル] [脱退する]
```

削除時:
```
グループを削除しますか?

このグループに関連する全てのデータ（処方箋、服薬記録など）が削除されます。
この操作は元に戻すことができません。

[キャンセル] [削除する]
```

---

## 論理削除機能

### 概要

グループとメンバーの削除・脱退は論理削除で実装。データを物理的には削除せず、`deletedAt` / `leftAt` フィールドをセットすることで「削除済み」「脱退済み」として扱う。

### 目的

- **データ整合性の維持**: 過去の統計を正確に保持
- **誤操作からの復旧**: 脱退したメンバーが再参加時にデータを復元
- **監査証跡**: 脱退・削除履歴を保持

### 実装方針

#### 脱退時の挙動

- groupMembers.leftAtに現在時刻を設定
- 関連データ（処方箋、服薬記録）は保持される
- 再参加時にleftAtをundefinedに戻すことで復元

#### 削除時の挙動

- groups.deletedAtに現在時刻を設定
- 全てのgroupMembersを論理削除
- 関連データ（prescriptions, medicines, schedules, records）を全て論理削除

#### クエリでのフィルタリング

全てのクエリで以下のフィルタを適用：
```typescript
// groupMembers
.filter((q) => q.eq(q.field("leftAt"), undefined))

// groups
.filter((q) => q.eq(q.field("deletedAt"), undefined))
```

---

## 制限事項

- **所属グループ数上限**: なし
- **メンバー数上限**: なし（将来的に検討）
- **招待コード有効期限**: 7日間（固定）
- **招待コード再利用**: 不可（使用後は無効化）
- **権限管理**: 未実装（全メンバー同等権限）
- **Patient role制約**: 1グループに1人のPatientのみ（既存仕様を維持）
- **グループ削除の復元**: Phase 1では未実装（将来的に実装予定）
- **データ保持期間**: 無期限保持（将来的にクリーンアップ機能を検討）

---

## テスト

### ユニットテスト
- 招待コード生成（一意性）
- 有効期限計算

### 統合テスト
- グループCRUD操作
- 招待フロー全体
- 脱退 → 再参加 → データ復元フロー
- グループ削除 → 関連データの論理削除

### E2Eテスト
- グループ作成→招待→参加フロー
- グループ作成 → メンバー追加 → 脱退 → 削除フロー
- 脱退 → 再招待 → 再参加 → データ復元フロー

---

## 関連ドキュメント

- [認証機能](auth.md)
- [服薬管理](medication.md)
- [アーキテクチャ](../../architecture.md)
- [グループ脱退・削除機能の導入決定記録](../../decisions/2025-10-26-group-leave-delete.md)
