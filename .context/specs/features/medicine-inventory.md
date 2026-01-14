# 薬の残量管理機能仕様

**最終更新**: 2026年1月12日

## 概要

グループ内での薬の残量を追跡し、予定外消費（オーバードーズ、紛失等）を記録、支援者に通知する機能。通常の残量管理アプリにはない「予定外消費の追跡」と「支援者への即座通知」が差別化ポイント。

---

## データモデル

### 1. medicineInventory（残量管理）

```typescript
{
  _id: Id<"medicineInventory">,
  medicineId: Id<"medicines">,
  groupId: Id<"groups">,
  currentQuantity: number,        // 現在の残量
  unit: string,                   // 単位（錠、カプセル、mg等）
  warningThreshold?: number,      // 警告閾値（この数以下で警告）
  isTrackingEnabled: boolean,     // 追跡有効フラグ
  createdBy: string,
  createdAt: number,
  updatedAt: number,
}
```

**インデックス**:
- `by_medicineId`: 薬別在庫取得
- `by_groupId`: グループ別在庫一覧
- `by_groupId_isTracking`: 追跡中の在庫一覧

### 2. medicineConsumptionRecords（消費記録）

```typescript
{
  _id: Id<"medicineConsumptionRecords">,
  medicineId: Id<"medicines">,
  inventoryId: Id<"medicineInventory">,
  groupId: Id<"groups">,
  patientId: string,
  consumptionType: "scheduled" | "extra" | "lost" | "adjustment" | "refill",
  quantity: number,               // 消費/補充量（符号で方向を示す）
  quantityBefore: number,         // 変更前の残量
  quantityAfter: number,          // 変更後の残量
  relatedRecordId?: Id<"medicationRecords">,  // 服薬記録との紐付け
  reason?: string,                // 理由（予定外消費時に必須）
  recordedBy: string,
  recordedAt: number,
  createdAt: number,
}
```

**消費タイプ**:

| タイプ | 説明 | 自動生成 | quantityの符号 |
|--------|------|----------|----------------|
| `scheduled` | 予定通りの服薬 | Yes（服薬記録時） | 負（消費） |
| `extra` | 追加服用（多く飲んだ） | No | 負（消費） |
| `lost` | 紛失 | No | 負（消費） |
| `adjustment` | 調整（棚卸し） | No | 正または負 |
| `refill` | 補充 | No | 正（補充） |

**インデックス**:
- `by_inventoryId`: 在庫別消費履歴
- `by_groupId`: グループ別消費履歴
- `by_recordedAt`: 記録日時順

### 3. inventoryAlerts（アラート）

```typescript
{
  _id: Id<"inventoryAlerts">,
  inventoryId: Id<"medicineInventory">,
  groupId: Id<"groups">,
  alertType: "low_stock" | "out_of_stock" | "unexpected_consumption" | "overdose_warning",
  severity: "info" | "warning" | "critical",
  message: string,
  relatedConsumptionId?: Id<"medicineConsumptionRecords">,
  medicineName: string,
  isRead: boolean,
  readBy?: string,
  readAt?: number,
  createdAt: number,
}
```

**アラートタイプ**:

| タイプ | 説明 | 重要度 |
|--------|------|--------|
| `low_stock` | 残量が閾値以下 | warning |
| `out_of_stock` | 在庫切れ（残量0、処方箋継続中） | critical |
| `unexpected_consumption` | 予定外消費の発生 | warning/critical |
| `overdose_warning` | 過剰服用の可能性 | critical |

**インデックス**:
- `by_groupId`: グループ別アラート
- `by_groupId_isRead`: 未読アラート取得
- `by_inventoryId`: 在庫別アラート

---

## 機能

### 1. 残量管理初期化

#### 残量追跡を開始
**API**: `medications.inventory.mutations.initializeInventory`
```typescript
{
  args: {
    medicineId: Id<"medicines">,
    initialQuantity: number,
    unit: string,
    warningThreshold?: number,
  },
  returns: Result<Id<"medicineInventory">>
}
```

**挙動**:
- 指定した薬の残量追跡を開始
- 初期残量と単位を設定
- オプションで警告閾値を設定
- 既に追跡中の場合はエラー

### 2. 残量操作

#### 残量調整
**API**: `medications.inventory.mutations.adjustQuantity`
```typescript
{
  args: {
    inventoryId: Id<"medicineInventory">,
    newQuantity: number,
    reason: string,
  },
  returns: Result<void>
}
```

**挙動**:
- 棚卸しなどで残量を調整
- 消費記録（adjustment）を自動作成
- 調整理由を記録

#### 補充記録
**API**: `medications.inventory.mutations.recordRefill`
```typescript
{
  args: {
    inventoryId: Id<"medicineInventory">,
    quantity: number,
    notes?: string,
  },
  returns: Result<void>
}
```

**挙動**:
- 薬の補充を記録
- 残量を増加
- 消費記録（refill）を作成

#### 予定外消費記録
**API**: `medications.inventory.mutations.recordUnexpectedConsumption`
```typescript
{
  args: {
    inventoryId: Id<"medicineInventory">,
    quantity: number,
    consumptionType: "extra" | "lost",
    reason: string,
  },
  returns: Result<void>
}
```

**挙動**:
- 予定外の消費を記録
- 残量を減少
- アラートを自動生成（unexpected_consumption）
- 支援者にプッシュ通知を送信

### 3. 残量取得

#### 薬別残量取得
**API**: `medications.inventory.queries.getInventoryByMedicine`
```typescript
{
  args: {
    medicineId: Id<"medicines">,
  },
  returns: MedicineInventory | null
}
```

#### グループ別残量一覧
**API**: `medications.inventory.queries.getInventoriesByGroup`
```typescript
{
  args: {
    groupId: Id<"groups">,
    trackingOnly?: boolean,
  },
  returns: Array<MedicineInventory & { medicineName: string, isLowStock: boolean }>
}
```

#### 残量不足一覧
**API**: `medications.inventory.queries.getLowStockInventories`
```typescript
{
  args: {
    groupId: Id<"groups">,
  },
  returns: Array<MedicineInventory & { medicineName: string }>
}
```

### 4. 消費履歴

#### 在庫別消費履歴
**API**: `medications.inventory.queries.getConsumptionHistory`
```typescript
{
  args: {
    inventoryId: Id<"medicineInventory">,
    limit?: number,
  },
  returns: Array<MedicineConsumptionRecord>
}
```

#### グループ別消費履歴
**API**: `medications.inventory.queries.getGroupConsumptionHistory`
```typescript
{
  args: {
    groupId: Id<"groups">,
    limit?: number,
    consumptionType?: ConsumptionType,
  },
  returns: Array<MedicineConsumptionRecord & { medicineName: string }>
}
```

### 5. アラート管理

#### 未読アラート取得
**API**: `medications.alerts.queries.getUnreadAlerts`
```typescript
{
  args: {
    groupId: Id<"groups">,
  },
  returns: Array<InventoryAlert>
}
```

#### アラート既読化
**API**: `medications.alerts.mutations.markAsRead`
```typescript
{
  args: {
    alertId: Id<"inventoryAlerts">,
  },
  returns: Result<void>
}
```

#### 全アラート既読化
**API**: `medications.alerts.mutations.markAllAsRead`
```typescript
{
  args: {
    groupId: Id<"groups">,
  },
  returns: Result<void>
}
```

---

## 既存機能との連携

### 服薬記録との連携

服薬記録作成時（status="taken"）に、対象の薬に残量追跡が有効な場合：

1. 残量を自動的に減少
2. 消費記録（scheduled）を自動作成
3. 残量が閾値以下になったらアラート生成

**実装箇所**: `convex/medications/records/mutations.ts`

```typescript
// recordSimpleMedication 内で以下を追加
if (status === "taken" && medicineId) {
  const inventory = await getInventoryByMedicine(ctx, { medicineId });
  if (inventory && inventory.isTrackingEnabled) {
    // 残量を減少
    // 消費記録を作成
    // 閾値チェック → アラート生成
  }
}
```

---

## プッシュ通知

### 通知タイミング

| イベント | 通知先 | 優先度 |
|----------|--------|--------|
| 予定外消費（extra） | 支援者 | 高 |
| 紛失（lost） | 支援者 | 高 |
| 残量不足 | 全員 | 中 |
| 過剰服用警告 | 支援者 | 最高 |

### 通知内容

```typescript
{
  title: "予定外消費のお知らせ",
  body: "ロキソニンが予定外に2錠消費されました",
  url: "/inventory",
}
```

---

## UI実装

### 残量管理ページ (`/inventory`)

#### ページ構成
1. **アラート一覧**: 未読アラートを表示
2. **残量一覧**: 追跡中の薬の残量をカードで表示
3. **追跡設定**: 未設定の薬を表示し、追跡開始を促す

#### コンポーネント

##### InventoryCard
- 薬名と残量をプログレスバーで表示
- 警告閾値を下回ると黄色、ゼロで赤色
- 消費記録ダイアログへのボタン

##### ConsumptionRecordDialog
- 消費タイプ選択（追加服用/紛失/補充/調整）
- 数量入力
- 理由入力（予定外消費時は必須）

##### AlertList
- 未読アラートを時系列で表示
- アラートタイプに応じたアイコン
- 既読ボタン

##### InitializeInventoryDialog
- 初期残量入力
- 単位選択
- 警告閾値設定

##### InventoryBadge
- 残量をバッジで表示
- 色分け（正常:緑、警告:黄、不足:赤）

---

## 差別化ポイント

### 1. 予定外消費の追跡

一般的な残量管理アプリにはない機能：
- オーバードーズ（多く飲んでしまった）
- 紛失（落とした、なくした）
- 間違い飲み

これらを記録し、支援者に即座に通知することで：
- 精神疾患患者の服薬管理をサポート
- 家族や支援者が異常を早期に把握
- 適切な対応を促す

### 2. 支援者への即座通知

- 予定外消費発生時にプッシュ通知
- 過剰服用の可能性を早期に察知
- 支援者が状況を確認し、必要に応じて連絡可能

---

## テスト

### ユニットテスト
- 残量計算ロジック
- 閾値判定
- 消費記録生成

### 統合テスト
- 残量追跡開始〜消費記録〜アラート生成フロー
- 服薬記録との連携

### E2Eテスト
- 残量追跡設定フロー
- 予定外消費記録フロー
- アラート確認フロー

---

## 関連ドキュメント

- [服薬管理機能](medication.md)
- [プッシュ通知機能](push-notifications.md)
- [薬の残量管理機能の決定記録](../../decisions/2026-01-12-medicine-inventory.md)
