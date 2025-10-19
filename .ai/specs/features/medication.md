# 服薬管理機能仕様

**最終更新**: 2025年10月16日

## 概要

グループ内での服薬記録管理システム。薬剤マスタ、スケジュール、服薬記録、履歴管理機能を提供。

---

## データモデル

### 1. medicines（薬剤マスタ）

```typescript
{
  _id: Id<"medicines">,
  groupId: Id<"groups">,
  name: string,
  description?: string,
  createdBy: string,
  createdAt: number,
  isActive: boolean,          // 服用中かどうか
}
```

**インデックス**:
- `by_groupId`: グループ別薬剤一覧
- `by_groupId_isActive`: 服用中薬剤フィルタリング

### 2. medicationSchedules（服薬スケジュール）

```typescript
{
  _id: Id<"medicationSchedules">,
  medicineId: Id<"medicines">,
  groupId: Id<"groups">,
  timings: ("morning" | "noon" | "evening" | "bedtime" | "asNeeded")[],
  dosage?: string,            // 例: "1錠", "2カプセル"
  notes?: string,
  createdBy: string,
  createdAt: number,
  updatedAt: number,
}
```

**タイミング種別**:
- `morning`: 朝
- `noon`: 昼
- `evening`: 晩
- `bedtime`: 就寝前
- `asNeeded`: 頓服

**インデックス**:
- `by_medicineId`: 薬剤別スケジュール
- `by_groupId`: グループ別スケジュール

### 3. medicationRecords（服薬記録）

```typescript
{
  _id: Id<"medicationRecords">,
  medicineId?: Id<"medicines">,
  scheduleId?: Id<"medicationSchedules">,
  simpleMedicineName?: string,    // 薬剤未登録時の表示名
  groupId: Id<"groups">,
  patientId: string,
  timing: "morning" | "noon" | "evening" | "bedtime" | "asNeeded",
  scheduledDate: string,          // YYYY-MM-DD形式
  takenAt?: number,               // 実際に服用した日時
  status: "pending" | "taken" | "skipped",
  recordedBy: string,             // 記録者（本人またはサポーター）
  notes?: string,
  createdAt: number,
  updatedAt: number,
}
```

**インデックス**:
- `by_groupId`: グループ別記録
- `by_patientId`: 患者別記録
- `by_scheduleId`: スケジュール別記録
- `by_scheduledDate`: 日付別記録
- `by_groupId_scheduledDate`: グループ×日付検索
- `by_patientId_scheduledDate`: 患者×日付検索
- `by_status`: ステータス別検索
- `by_patientId_timing_scheduledDate`: 患者×タイミング×日付検索

### 4. medicationRecordsHistory（履歴）

```typescript
{
  _id: Id<"medicationRecordsHistory">,
  originalRecordId: Id<"medicationRecords">,
  // ... medicationRecordsと同じフィールド
  historyType: "deleted" | "updated",
  archivedAt: number,
  archivedBy: string,
}
```

**インデックス**:
- `by_originalRecordId`: 元レコード別履歴
- `by_groupId`: グループ別履歴
- `by_patientId`: 患者別履歴
- `by_archivedAt`: アーカイブ日時

---

## 機能

### 1. 薬剤管理

#### 薬剤登録
**API**: `medicines.mutations.create`
```typescript
{
  args: {
    groupId: Id<"groups">,
    name: string,
    description?: string,
  },
  returns: Id<"medicines">
}
```

#### 薬剤一覧取得
**API**: `medicines.queries.list`
```typescript
{
  args: {
    groupId: Id<"groups">,
    isActive?: boolean,
  },
  returns: Array<Medicine>
}
```

#### 薬剤更新
**API**: `medicines.mutations.update`
```typescript
{
  args: {
    medicineId: Id<"medicines">,
    name?: string,
    description?: string,
    isActive?: boolean,
  },
  returns: void
}
```

### 2. スケジュール管理

#### スケジュール作成
**API**: `medicationSchedules.mutations.create`
```typescript
{
  args: {
    medicineId: Id<"medicines">,
    timings: Timing[],
    dosage?: string,
    notes?: string,
  },
  returns: Id<"medicationSchedules">
}
```

#### スケジュール一覧
**API**: `medicationSchedules.queries.list`
```typescript
{
  args: {
    groupId?: Id<"groups">,
    medicineId?: Id<"medicines">,
  },
  returns: Array<MedicationSchedule>
}
```

### 3. 服薬記録

#### 記録作成（服薬実行）
**API**: `medicationRecords.mutations.create`
```typescript
{
  args: {
    scheduleId?: Id<"medicationSchedules">,
    simpleMedicineName?: string,
    timing: Timing,
    scheduledDate: string,
    status: "taken" | "pending",
    notes?: string,
  },
  returns: Id<"medicationRecords">
}
```

#### 記録更新
**API**: `medicationRecords.mutations.update`
```typescript
{
  args: {
    recordId: Id<"medicationRecords">,
    status?: "taken" | "skipped" | "pending",
    takenAt?: number,
    notes?: string,
  },
  returns: void
}
```

**履歴保存**: 更新前の状態をhistoryテーブルに自動保存

#### 記録削除
**API**: `medicationRecords.mutations.remove`
```typescript
{
  args: {
    recordId: Id<"medicationRecords">,
  },
  returns: void
}
```

**履歴保存**: 削除前の状態をhistoryテーブルに保存

#### 日別記録取得
**API**: `medicationRecords.queries.getByDate`
```typescript
{
  args: {
    patientId: string,
    scheduledDate: string,
  },
  returns: Array<{
    _id: Id<"medicationRecords">,
    medicineName: string,
    timing: Timing,
    status: "pending" | "taken" | "skipped",
    takenAt?: number,
    notes?: string,
  }>
}
```

#### カレンダー表示用データ
**API**: `medicationRecords.queries.getMonthly`
```typescript
{
  args: {
    patientId: string,
    year: number,
    month: number,
  },
  returns: Record<string, {
    totalScheduled: number,
    totalTaken: number,
    totalSkipped: number,
    adherenceRate: number,
  }>
}
```

---

## 服薬継続率計算

```typescript
adherenceRate = (taken / (taken + skipped)) * 100
```

**除外**:
- `pending`ステータスは計算に含めない
- 未来の予定は除外

---

## UI実装

### 服薬記録ダッシュボード
- 今日の服薬予定一覧
- タイミング別（朝・昼・晩・就寝前）
- 服薬チェックボタン

### カレンダービュー
- 月別カレンダー
- 日別の服薬達成率表示
- 日付クリックで詳細表示

### 薬剤管理画面
- 登録薬剤一覧
- 薬剤追加・編集フォーム

### スケジュール設定
- 薬剤別のタイミング設定
- 用量・メモ入力

---

## 履歴機能

### 用途
- 誤操作時の復元
- 変更履歴の追跡
- データ分析

### 保存タイミング
- 記録更新時
- 記録削除時

### 参照
**API**: `medicationRecordsHistory.queries.list`
```typescript
{
  args: {
    originalRecordId?: Id<"medicationRecords">,
    patientId?: string,
    startDate?: number,
    endDate?: number,
  },
  returns: Array<MedicationRecordHistory>
}
```

---

## 制限事項

- **簡易服薬記録**: medicineId未設定の記録も可能（柔軟性）
- **複数スケジュール**: 1薬剤に複数スケジュール可能
- **履歴の削除**: 履歴は削除不可（監査証跡）

---

## テスト

### ユニットテスト
- 服薬継続率計算
- 日付フォーマット変換

### 統合テスト
- 服薬記録CRUD
- 履歴自動保存

### E2Eテスト
- 服薬記録フロー（登録→実行→確認）

---

## 関連ドキュメント

- [グループ管理](group.md)
- [アーキテクチャ](../../context/architecture.md)
