# 服薬管理機能仕様

**最終更新**: 2025年10月26日

## 概要

グループ内での服薬記録管理システム。処方箋管理、薬剤マスタ、スケジュール、服薬記録、履歴管理、論理削除・復元機能を提供。

---

## データモデル

### 1. prescriptions（処方箋）

```typescript
{
  _id: Id<"prescriptions">,
  groupId: Id<"groups">,
  name: string,                    // 処方箋名（例：「10月分の処方箋」）
  startDate: string,               // YYYY-MM-DD
  endDate?: string,                // YYYY-MM-DD（未指定 = 継続中）
  isActive: boolean,               // 服用中かどうか
  notes?: string,
  createdBy: string,
  createdAt: number,
  updatedAt: number,
  deletedAt?: number,              // 論理削除日時
  deletedBy?: string,              // 削除者のユーザーID
}
```

**インデックス**:
- `by_groupId`: グループ別処方箋一覧
- `by_groupId_isActive`: 服用中処方箋フィルタリング
- `by_groupId_startDate`: 開始日でのソート
- `by_groupId_deletedAt`: 削除済み処方箋取得

### 2. medicines（薬剤マスタ）

```typescript
{
  _id: Id<"medicines">,
  groupId: Id<"groups">,
  prescriptionId?: Id<"prescriptions">, // 処方箋との紐付け
  name: string,
  description?: string,
  createdBy: string,
  createdAt: number,
  deletedAt?: number,              // 論理削除日時
  deletedBy?: string,              // 削除者のユーザーID
}
```

**インデックス**:
- `by_groupId`: グループ別薬剤一覧
- `by_prescriptionId`: 処方箋別薬剤一覧

### 3. medicationSchedules（服薬スケジュール）

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
  deletedAt?: number,              // 論理削除日時
  deletedBy?: string,              // 削除者のユーザーID
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

### 4. medicationRecords（服薬記録）

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
  deletedAt?: number,              // 論理削除日時
  deletedBy?: string,              // 削除者のユーザーID
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

### 5. medicationRecordsHistory（履歴）

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

### 1. 処方箋管理

#### 処方箋登録
**API**: `prescriptions.mutations.createPrescription`
```typescript
{
  args: {
    groupId: Id<"groups">,
    name: string,
    startDate: string,
    endDate?: string,
    notes?: string,
    medicines: Array<{
      name: string,
      description?: string,
      timings: Timing[],
      dosage?: string,
      scheduleNotes?: string,
    }>,
  },
  returns: Id<"prescriptions">
}
```

#### 処方箋一覧取得
**API**: `prescriptions.queries.getPrescriptions`
```typescript
{
  args: {
    groupId: Id<"groups">,
  },
  returns: Array<Prescription>  // 論理削除されたものは除外
}
```

#### 削除された処方箋一覧取得
**API**: `prescriptions.queries.getDeletedPrescriptions`
```typescript
{
  args: {
    groupId: Id<"groups">,
  },
  returns: Array<Prescription>  // 論理削除されたもののみ
}
```

#### 処方箋詳細取得
**API**: `prescriptions.queries.getPrescription`
```typescript
{
  args: {
    prescriptionId: Id<"prescriptions">,
  },
  returns: Prescription
}
```

#### 処方箋に含まれる薬一覧取得
**API**: `prescriptions.queries.getPrescriptionMedicines`
```typescript
{
  args: {
    prescriptionId: Id<"prescriptions">,
  },
  returns: Array<{
    ...medicine,
    schedule: MedicationSchedule | null,
  }>
}
```

#### 処方箋削除
**API**: `prescriptions.mutations.deletePrescription`
```typescript
{
  args: {
    prescriptionId: Id<"prescriptions">,
  },
  returns: void
}
```

**挙動**:
- 紐付く服薬記録が存在する場合：論理削除（deletedAt, deletedByをセット）
- 紐付く服薬記録が存在しない場合：物理削除
- 論理削除時は、関連するmedicines, schedules, recordsも全て論理削除

#### 処方箋復元
**API**: `prescriptions.mutations.restorePrescription`
```typescript
{
  args: {
    prescriptionId: Id<"prescriptions">,
  },
  returns: void
}
```

**挙動**:
- deletedAt, deletedByをundefinedに戻す
- 関連するmedicines, schedules, recordsも全て復元

### 2. 有効な薬剤の取得

#### 指定日に有効な薬剤を取得
**API**: `prescriptions.queries.getActiveMedicationsForDateQuery`
```typescript
{
  args: {
    groupId: Id<"groups">,
    date: string,  // YYYY-MM-DD
  },
  returns: Array<{
    prescriptionId: string,
    prescriptionName: string,
    medicineId: string,
    medicineName: string,
    scheduleId: string,
    timings: string[],
    dosage?: string,
  }>
}
```

**計算ロジック**:
1. `isActive = true` の処方箋を取得
2. `startDate <= date` かつ `(endDate が未設定 または endDate >= date)` でフィルタ
3. 処方箋に紐付く薬とスケジュールを取得
4. 論理削除されたデータは除外

### 3. 服薬記録

#### 記録作成（服薬実行）
**API**: `medicationRecords.mutations.recordSimpleMedication`
```typescript
{
  args: {
    groupId: Id<"groups">,
    timing: Timing,
    scheduledDate: string,
    medicineId?: Id<"medicines">,        // 処方箋ベースの場合
    scheduleId?: Id<"medicationSchedules">,  // 処方箋ベースの場合
    simpleMedicineName?: string,         // 簡易記録の場合
    status: "taken" | "skipped",
    notes?: string,
  },
  returns: Result<Id<"medicationRecords">>
}
```

**バリデーション**:
- `medicineId` または `simpleMedicineName` のいずれかが必須

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
**API**: `medicationRecords.queries.getTodayRecords`
```typescript
{
  args: {
    groupId: Id<"groups">,
    scheduledDate: string,
    patientId?: string,
  },
  returns: Array<MedicationRecord>  // 論理削除されたものは除外
}
```

#### 月別記録取得
**API**: `medicationRecords.queries.getMonthlyRecords`
```typescript
{
  args: {
    groupId: Id<"groups">,
    patientId?: string,
    year: number,
    month: number,
  },
  returns: Array<MedicationRecord>  // 論理削除されたものは除外
}
```

#### 月別統計取得
**API**: `medicationRecords.queries.getMonthlyStats`
```typescript
{
  args: {
    groupId: Id<"groups">,
    patientId?: string,
    year: number,
    month: number,
  },
  returns: {
    totalScheduled: number,
    totalTaken: number,
    totalSkipped: number,
    totalPending: number,
    adherenceRate: number,
    dailyStats: Record<string, DailyStat>,
    timingStats: Record<Timing, TimingStat>,
    asNeeded: {
      taken: number,
      skipped: number,
      pending: number,
      total: number,
    },
  }
}
```

**計算ロジック**:
1. 月の各日について、その日に有効な処方箋を取得
2. 処方箋に含まれる薬のタイミング数を集計（期待値）
3. 実際の記録と比較して統計を計算
4. 頓服は別枠で集計（服用率計算から除外）
5. 論理削除されたデータは除外

---

## 論理削除機能

### 概要

処方箋、薬、スケジュール、記録の削除は論理削除で実装。データを物理的には削除せず、`deletedAt` フィールドをセットすることで「削除済み」として扱う。

### 目的

- **データ整合性の維持**: 過去の統計を正確に保持
- **誤操作からの復旧**: 削除した処方箋を復元可能
- **監査証跡**: 削除履歴を保持

### 実装方針

#### 削除時の挙動

**処方箋削除**:
- 紐付く服薬記録が存在する場合：
  - 処方箋、medicines, schedules, records を全て論理削除
- 紐付く服薬記録が存在しない場合：
  - 処方箋、medicines, schedules を物理削除

#### クエリでのフィルタリング

全てのクエリで以下のフィルタを適用：
```typescript
.filter((q) => q.eq(q.field("deletedAt"), undefined))
```

#### 復元機能

- `deletedAt`, `deletedBy` を `undefined` に戻すことで復元
- 関連データ（medicines, schedules, records）も全て復元

---

## 服薬継続率計算

```typescript
adherenceRate = (taken / (taken + skipped + pending)) * 100
```

**期待値の計算**:
- 月の各日について、その日に有効な処方箋から期待値を算出
- 実際の記録数と期待値の差分をpendingとして計上

**除外**:
- 頓服（asNeeded）は継続率計算から除外
- 別枠で集計して表示

---

## UI実装

### 処方箋管理画面

#### 有効な処方箋タブ
- 処方箋一覧表示
- 処方箋登録ダイアログ
- 処方箋削除（論理削除または物理削除）
- 処方箋詳細の展開表示
- 含まれる薬の一覧表示

#### ゴミ箱タブ
- 論理削除された処方箋一覧
- 削除日時の表示
- 復元ボタン
- 削除済みバッジ

### 服薬記録ダッシュボード

#### 処方箋ベースの記録
- 今日有効な処方箋の薬を表示
- グループ表示（時間帯 or 処方箋）
- 服薬チェックボタン
- 記録状態の表示（pending/taken/skipped）

#### 簡易記録
- 薬剤名のみでの記録も可能
- 処方箋に紐付かない記録をサポート

### カレンダービュー
- 月別カレンダー
- 日別の服薬達成率表示
- 日付クリックで詳細表示

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
**API**: `medicationRecordsHistory.queries.getRecordHistory`
```typescript
{
  args: {
    recordId?: Id<"medicationRecords">,
    groupId?: Id<"groups">,
    patientId?: string,
  },
  returns: Array<MedicationRecordHistory>
}
```

---

## 制限事項

- **簡易服薬記録**: medicineId未設定の記録も可能（柔軟性）
- **複数スケジュール**: 1薬剤に複数スケジュール可能
- **履歴の削除**: 履歴は削除不可（監査証跡）
- **処方箋の重複**: 同じ期間に複数の処方箋が有効な状態を許可

---

## テスト

### ユニットテスト
- 服薬継続率計算
- 日付フォーマット変換
- 有効な処方箋の判定
- 論理削除フィルタの動作

### 統合テスト
- 処方箋CRUD
- 服薬記録CRUD
- 論理削除と復元
- 履歴自動保存

### E2Eテスト
- 処方箋登録→服薬記録→統計確認フロー
- 削除→復元フロー
- グループ切り替え時の動作

---

## 関連ドキュメント

- [グループ管理](group.md)
- [アーキテクチャ](../../architecture.md)
- [処方箋管理機能の導入 ADR](../../decisions/2025-10-26-prescription-management.md)
