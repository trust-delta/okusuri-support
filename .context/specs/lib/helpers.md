# バックエンドヘルパー関数仕様

**最終更新**: 2026年01月25日

## 概要

Convexバックエンドの重複コードを削減するための共通ヘルパー関数を提供するユーティリティライブラリ。認証、メンバーシップ、エンティティ検証、バッチ取得などの頻出パターンを抽象化し、一貫性のあるエラーハンドリングを実現します。

---

## ユースケース

### 主要シナリオ

**シナリオ1: 認証付きmutation**
1. ユーザーがグループ内のデータを更新しようとする
2. `requireAuthAndMembership`で認証とメンバーシップを一括確認
3. 権限がない場合はResult型でエラーを返却
4. 権限がある場合はuserId/membershipを取得して処理を続行

**シナリオ2: エンティティの存在・削除チェック**
1. 処方箋を削除しようとする
2. `requireActivePrescription`で存在確認と論理削除チェック
3. 既に削除済みの場合はエラーを返却
4. アクティブな場合は削除処理を実行

**シナリオ3: バッチデータ取得**
1. グループの全処方箋リストを表示する
2. `batchGetMedicinesByGroupId`でグループの全薬を一括取得
3. N+1問題を回避しながら効率的にデータを取得

---

## 機能要件

### 認証関連

#### requireAuth
- **説明**: 認証済みユーザーIDを取得（未認証時はResult型でエラー）
- **優先度**: 高
- **実装状況**: 完了
- **使用例**:
  ```typescript
  const authResult = await requireAuth(ctx);
  if (!authResult.isSuccess) return authResult;
  const userId = authResult.data;
  ```

#### getAuthenticatedUserId
- **説明**: 認証済みユーザーIDを取得（未認証時はnull）
- **優先度**: 高
- **実装状況**: 完了
- **使用例**:
  ```typescript
  const userId = await getAuthenticatedUserId(ctx);
  if (!userId) {
    return null; // または []
  }
  ```

### メンバーシップ関連

#### getMembership
- **説明**: ユーザーのグループメンバーシップを取得（null許容）
- **優先度**: 高
- **実装状況**: 完了
- **使用例**:
  ```typescript
  const membership = await getMembership(ctx, userId, groupId);
  if (!membership) {
    return null;
  }
  ```

#### requireMembership
- **説明**: ユーザーのグループメンバーシップを取得（エラー時はResult型）
- **優先度**: 高
- **実装状況**: 完了
- **使用例**:
  ```typescript
  const membershipResult = await requireMembership(ctx, userId, groupId);
  if (!membershipResult.isSuccess) return membershipResult;
  const membership = membershipResult.data;
  ```

#### requireAuthAndMembership
- **説明**: 認証+メンバーシップを一度に確認（最頻出パターン）
- **優先度**: 高
- **実装状況**: 完了
- **使用例**:
  ```typescript
  const authResult = await requireAuthAndMembership(ctx, args.groupId);
  if (!authResult.isSuccess) return authResult;
  const { userId, membership } = authResult.data;
  ```

#### isGroupMember
- **説明**: ユーザーがグループメンバーかどうかを判定（boolean返却）
- **優先度**: 中
- **実装状況**: 完了
- **使用例**:
  ```typescript
  const isMember = await isGroupMember(ctx, userId, groupId);
  if (!isMember) {
    // メンバーではない場合の処理
  }
  ```

### エンティティ検証関連

#### requireEntity
- **説明**: エンティティを取得（存在しない場合はエラー）
- **優先度**: 高
- **実装状況**: 完了
- **使用例**:
  ```typescript
  const result = await requireEntity(ctx, args.groupId, "グループ");
  if (!result.isSuccess) return result;
  const group = result.data;
  ```

#### requireActiveEntity
- **説明**: エンティティを取得し、削除済みでないことを確認
- **優先度**: 高
- **実装状況**: 完了
- **使用例**:
  ```typescript
  const result = await requireActiveEntity(ctx, args.groupId, "グループ");
  if (!result.isSuccess) return result;
  const group = result.data;
  ```

#### requireActiveGroup
- **説明**: グループを取得し、削除済みでないことを確認
- **優先度**: 高
- **実装状況**: 完了
- **使用例**:
  ```typescript
  const result = await requireActiveGroup(ctx, args.groupId);
  if (!result.isSuccess) return result;
  const group = result.data;
  ```

#### requireActiveMedicine
- **説明**: 薬を取得し、削除済みでないことを確認
- **優先度**: 高
- **実装状況**: 完了
- **使用例**:
  ```typescript
  const result = await requireActiveMedicine(ctx, args.medicineId);
  if (!result.isSuccess) return result;
  const medicine = result.data;
  ```

#### requireActivePrescription
- **説明**: 処方箋を取得し、削除済みでないことを確認
- **優先度**: 高
- **実装状況**: 完了
- **使用例**:
  ```typescript
  const result = await requireActivePrescription(ctx, args.prescriptionId);
  if (!result.isSuccess) return result;
  const prescription = result.data;
  ```

#### isDeleted
- **説明**: エンティティが削除済みかどうかを判定
- **優先度**: 中
- **実装状況**: 完了
- **使用例**:
  ```typescript
  if (isDeleted(entity)) {
    return error("削除済みです");
  }
  ```

#### isActive
- **説明**: エンティティがアクティブ（削除されていない）かどうかを判定
- **優先度**: 中
- **実装状況**: 完了
- **使用例**:
  ```typescript
  if (!isActive(entity)) {
    return error("削除済みです");
  }
  ```

### バッチ取得関連

#### batchGetDocuments
- **説明**: 複数のIDからドキュメントを一括取得
- **優先度**: 中
- **実装状況**: 完了
- **使用例**:
  ```typescript
  const docMap = await batchGetDocuments(ctx, prescriptionIds);
  const prescription = docMap.get(String(id));
  ```

#### batchGetSchedulesByMedicineIds
- **説明**: 複数の薬IDからスケジュールを一括取得
- **優先度**: 中
- **実装状況**: 完了
- **使用例**:
  ```typescript
  const scheduleMap = await batchGetSchedulesByMedicineIds(ctx, medicineIds);
  const schedule = scheduleMap.get(String(medicineId));
  ```

#### batchGetSchedulesByGroupId
- **説明**: グループIDから全スケジュールを一括取得
- **優先度**: 中
- **実装状況**: 完了
- **使用例**:
  ```typescript
  const scheduleMap = await batchGetSchedulesByGroupId(ctx, groupId);
  ```

#### batchGetMedicinesByPrescriptionIds
- **説明**: 複数の処方箋IDから薬を一括取得
- **優先度**: 中
- **実装状況**: 完了
- **使用例**:
  ```typescript
  const medicinesMap = await batchGetMedicinesByPrescriptionIds(ctx, prescriptionIds);
  const medicines = medicinesMap.get(String(prescriptionId));
  ```

#### batchGetMedicinesByGroupId
- **説明**: グループIDから全薬を一括取得して処方箋IDでグループ化
- **優先度**: 中
- **実装状況**: 完了
- **使用例**:
  ```typescript
  const { allMedicines, medicinesByPrescriptionId } = await batchGetMedicinesByGroupId(ctx, groupId);
  ```

---

## 技術仕様

### ファイル構成

```
convex/helpers/
├── index.ts      # エクスポート一覧
├── auth.ts       # 認証ヘルパー
├── membership.ts # メンバーシップヘルパー
├── entity.ts     # エンティティ検証ヘルパー
└── batch.ts      # バッチ取得ヘルパー
```

### 関数シグネチャ

#### 認証関連

```typescript
// Result型でエラーを返す（mutation/action向け）
async function requireAuth(ctx: AnyCtx): Promise<Result<Id<"users">>>

// nullを返す（query向け）
async function getAuthenticatedUserId(ctx: AnyCtx): Promise<Id<"users"> | null>
```

**型定義**:
```typescript
type AnyCtx = QueryCtx | MutationCtx | ActionCtx
```

#### メンバーシップ関連

```typescript
interface MembershipOptions {
  /** 脱退済みメンバーを除外するか（デフォルト: true） */
  activeOnly?: boolean;
}

// nullを返す（query向け）
async function getMembership(
  ctx: DbCtx,
  userId: Id<"users"> | string,
  groupId: Id<"groups">,
  options?: MembershipOptions
): Promise<Doc<"groupMembers"> | null>

// Result型でエラーを返す
async function requireMembership(
  ctx: DbCtx,
  userId: Id<"users"> | string,
  groupId: Id<"groups">,
  options?: MembershipOptions
): Promise<Result<Doc<"groupMembers">>>

// 認証+メンバーシップ一括確認
async function requireAuthAndMembership(
  ctx: DbCtx,
  groupId: Id<"groups">,
  options?: MembershipOptions
): Promise<Result<{ userId: Id<"users">; membership: Doc<"groupMembers"> }>>

// boolean判定
async function isGroupMember(
  ctx: DbCtx,
  userId: Id<"users"> | string,
  groupId: Id<"groups">,
  options?: MembershipOptions
): Promise<boolean>
```

#### エンティティ検証関連

```typescript
// 汎用エンティティ取得
async function requireEntity<T extends TableNames>(
  ctx: DbCtx,
  id: Id<T>,
  entityName: string
): Promise<Result<Doc<T>>>

// 汎用アクティブエンティティ取得
async function requireActiveEntity<T extends TableNames>(
  ctx: DbCtx,
  id: Id<T>,
  entityName: string,
  deletedMessage?: string
): Promise<Result<Doc<T>>>

// 特化型ヘルパー
async function requireActiveGroup(ctx: DbCtx, groupId: Id<"groups">): Promise<Result<Doc<"groups">>>
async function requireActiveMedicine(ctx: DbCtx, medicineId: Id<"medicines">): Promise<Result<Doc<"medicines">>>
async function requireActivePrescription(ctx: DbCtx, prescriptionId: Id<"prescriptions">): Promise<Result<Doc<"prescriptions">>>

// 状態判定
function isDeleted<T extends SoftDeletable>(entity: T | null | undefined): boolean
function isActive<T extends SoftDeletable>(entity: T | null | undefined): entity is T
```

#### バッチ取得関連

```typescript
// 汎用バッチ取得
async function batchGetDocuments<T extends "prescriptions" | "medicines">(
  ctx: DbCtx,
  ids: Id<T>[]
): Promise<Map<string, Doc<T>>>

// スケジュール取得
async function batchGetSchedulesByMedicineIds(
  ctx: DbCtx,
  medicineIds: Id<"medicines">[]
): Promise<Map<string, Doc<"medicationSchedules">>>

async function batchGetSchedulesByGroupId(
  ctx: DbCtx,
  groupId: Id<"groups">
): Promise<Map<string, Doc<"medicationSchedules">>>

// 薬取得
async function batchGetMedicinesByPrescriptionIds(
  ctx: DbCtx,
  prescriptionIds: Id<"prescriptions">[]
): Promise<Map<string, Doc<"medicines">[]>>

async function batchGetMedicinesByGroupId(
  ctx: DbCtx,
  groupId: Id<"groups">
): Promise<{
  allMedicines: Doc<"medicines">[];
  medicinesByPrescriptionId: Map<string, Doc<"medicines">[]>;
}>
```

---

## ビジネスルール

### 認証ルール

1. **mutation/action**: `requireAuth`でResult型のエラーを返す
2. **query**: `getAuthenticatedUserId`でnullを返す（空配列返却パターン）

### メンバーシップルール

1. **デフォルト動作**: アクティブメンバーのみ取得（`activeOnly: true`）
2. **脱退済み含む**: `{ activeOnly: false }`を指定
3. **userIdの変換**: `groupMembers`テーブルのuserIdは文字列として保存されているため、内部で変換

### エンティティルール

1. **論理削除判定**: `deletedAt`フィールドの有無で判定
2. **エラーメッセージ**: エンティティ名を含む日本語メッセージ
3. **カスタムメッセージ**: `deletedMessage`パラメータで上書き可能

### バッチ取得ルール

1. **削除済み除外**: `deletedAt`がundefinedのもののみ取得
2. **Mapの返却**: IDをキーとしたMapで返却（O(1)アクセス）
3. **空入力対応**: 空配列を渡した場合は空のMapを返却

---

## 使用箇所

### 現在の使用箇所

| ファイル | 使用関数 |
|----------|----------|
| `convex/groups/*.ts` | `requireAuthAndMembership`, `requireActiveGroup` |
| `convex/medicines/*.ts` | `requireActiveMedicine`, `batchGetSchedulesByMedicineIds` |
| `convex/prescriptions/*.ts` | `requireActivePrescription`, `batchGetMedicinesByPrescriptionIds` |
| `convex/medication/*.ts` | `requireAuth`, `getMembership` |

---

## パフォーマンス要件

- **バッチ取得**: N+1問題を回避するため、可能な限りバッチ関数を使用
- **インデックス活用**: 各バッチ関数は適切なインデックスを使用
- **早期リターン**: 認証・権限チェックは処理の最初に実行

### 最適化戦略

1. `requireAuthAndMembership`で認証+メンバーシップを1回で確認
2. `batchGetMedicinesByGroupId`でグループ全体の薬を1クエリで取得
3. `Map`を使用したO(1)アクセス

---

## テスト要件

### ユニットテスト

#### 認証関連
- [ ] requireAuth: 認証済みの場合にuserId返却
- [ ] requireAuth: 未認証の場合にエラー返却
- [ ] getAuthenticatedUserId: 認証済みの場合にuserId返却
- [ ] getAuthenticatedUserId: 未認証の場合にnull返却

#### メンバーシップ関連
- [ ] getMembership: メンバーの場合にDoc返却
- [ ] getMembership: 非メンバーの場合にnull返却
- [ ] requireMembership: メンバーの場合にDoc返却
- [ ] requireMembership: 非メンバーの場合にエラー返却
- [ ] requireAuthAndMembership: 認証+メンバーの場合に両方返却
- [ ] isGroupMember: メンバーの場合にtrue返却

#### エンティティ関連
- [ ] requireEntity: 存在する場合にDoc返却
- [ ] requireEntity: 存在しない場合にエラー返却
- [ ] requireActiveEntity: アクティブな場合にDoc返却
- [ ] requireActiveEntity: 削除済みの場合にエラー返却
- [ ] isDeleted: 削除済みの場合にtrue返却
- [ ] isActive: アクティブな場合にtrue返却（型ガード）

#### バッチ関連
- [ ] batchGetDocuments: 複数ID取得
- [ ] batchGetSchedulesByMedicineIds: 薬ID→スケジュールMap
- [ ] batchGetMedicinesByGroupId: グループID→薬一覧

テスト実装: `convex/__tests__/helpers/`

---

## 依存関係

### 内部依存
- `convex/types/result.ts`: Result型、success/errorヘルパー

### 外部依存
- `@convex-dev/auth/server`: `getAuthUserId`関数

---

## 関連ドキュメント

- [result-type.md](./result-type.md) - Result型仕様
- [error-handling.md](../../error-handling.md) - エラーハンドリング戦略
- [testing-strategy.md](../../testing-strategy.md) - テスト戦略

---

## 実装ファイル

**パス**: `convex/helpers/`

**エクスポート関数**:

| カテゴリ | 関数 |
|----------|------|
| 認証 | `requireAuth`, `getAuthenticatedUserId` |
| メンバーシップ | `getMembership`, `requireMembership`, `requireAuthAndMembership`, `isGroupMember` |
| エンティティ | `requireEntity`, `requireActiveEntity`, `requireActiveGroup`, `requireActiveMedicine`, `requireActivePrescription`, `isDeleted`, `isActive` |
| バッチ | `batchGetDocuments`, `batchGetSchedulesByMedicineIds`, `batchGetSchedulesByGroupId`, `batchGetMedicinesByPrescriptionIds`, `batchGetMedicinesByGroupId` |

**エクスポート型**:
- `MembershipOptions`

---

## 既知の課題

現時点で既知の課題はありません。

---

## 変更履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2026年01月25日 | 初版作成 | Claude |
