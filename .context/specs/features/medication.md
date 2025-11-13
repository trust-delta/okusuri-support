# 服薬管理機能仕様

**最終更新**: 2025年11月14日

## 概要

グループ内での服薬記録管理システム。処方箋管理、薬剤マスタ、スケジュール、服薬記録、履歴管理、論理削除・復元機能、デフォルト処方箋の自動作成を提供。

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
  dosage?: {
    amount: number,           // 例: 1, 2, 10
    unit: string,             // 例: "錠", "カプセル", "mg", "mL", "g", "回"
  },
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

### 6. medicineGroups（薬名統合グループ）

```typescript
{
  _id: Id<"medicineGroups">,
  groupId: Id<"groups">,
  canonicalName: string,           // 代表名（統計に表示される名前）
  medicineNames: string[],         // 統合する薬名の配列
  notes?: string,
  createdBy: string,
  createdAt: number,
  updatedAt: number,
}
```

**用途**:
- 薬名の表記ゆれを統一して統計を正確に表示
- 例: "ロキソニン", "ロキソニン錠", "ロキソニン錠60mg" → "ロキソニン" に統合

**インデックス**:
- `by_groupId`: グループ別グループ一覧

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
      dosage?: {
        amount: number,
        unit: string,
      },
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
- 常に論理削除（deletedAt, deletedByをセット）
- 関連するmedicines, schedules, recordsも全て論理削除
- ゴミ箱から復元可能

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

#### 処方箋完全削除
**API**: `prescriptions.mutations.permanentlyDeletePrescription`
```typescript
{
  args: {
    prescriptionId: Id<"prescriptions">,
  },
  returns: void
}
```

**挙動**:
- 論理削除済みの処方箋を物理削除
- 関連するmedicines, schedules, recordsも全て物理削除
- **この操作は取り消せません**

**用途**:
- ゴミ箱内の処方箋を完全に削除したい場合
- ストレージを節約したい場合

**注意**:
- 論理削除されていない処方箋には使用できません（先に削除が必要）
- 二重確認ダイアログで警告を表示

#### 処方箋の無効化
**API**: `prescriptions.mutations.deactivatePrescription`
```typescript
{
  args: {
    prescriptionId: Id<"prescriptions">,
  },
  returns: void
}
```

**挙動**:
- `isActive` を `false` に設定
- 既存の服薬記録は保持される
- 新規の服薬記録は作成できなくなる（有効な薬剤の取得から除外される）

**用途**:
- 処方が終了した場合
- 処方内容が変わった場合
- データを削除せずに処方箋を無効化したい場合

#### 処方箋の有効化
**API**: `prescriptions.mutations.activatePrescription`
```typescript
{
  args: {
    prescriptionId: Id<"prescriptions">,
  },
  returns: void
}
```

**挙動**:
- `isActive` を `true` に設定
- 無効化した処方箋を再度有効にする

#### 処方箋の終了日設定
**既存の機能**: `prescriptions.mutations.updatePrescription`
```typescript
{
  args: {
    prescriptionId: Id<"prescriptions">,
    endDate: string,  // YYYY-MM-DD
  },
  returns: Id<"prescriptions">
}
```

**用途**:
- 継続中（`endDate` 未設定）の処方箋に終了日を設定
- 期限が明確な処方に変更する

### 2. デフォルト処方箋機能

#### 概要

グループ作成時に自動的にデフォルト処方箋を作成し、処方箋管理に不慣れな初心者ユーザーでもすぐに服薬記録を始められるようにする機能。

#### デフォルト処方箋の内容

**処方箋情報**:
- **名前**: 「日常の薬」
- **開始日**: グループ作成日
- **終了日**: 未設定（継続中）
- **isActive**: `true`

**含まれる薬**:
1. **朝の薬**
   - タイミング: `["morning"]`
   - 用量: 未設定

2. **昼の薬**
   - タイミング: `["noon"]`
   - 用量: 未設定

3. **晩の薬**
   - タイミング: `["evening"]`
   - 用量: 未設定

4. **就寝前の薬**
   - タイミング: `["bedtime"]`
   - 用量: 未設定

#### 自動作成のタイミング

以下の処理でグループを作成した際に、自動的にデフォルト処方箋を作成：
1. `groups.mutations.createGroup` - 通常のグループ作成
2. `groups.mutations.completeOnboardingWithNewGroup` - オンボーディング完了時のグループ作成

#### 実装方法

**ヘルパー関数**: `prescriptions.helpers.createDefaultPrescription`
```typescript
{
  args: {
    ctx: MutationCtx,
    groupId: Id<"groups">,
    userId: string,
  },
  returns: Promise<Id<"prescriptions">>
}
```

**処理フロー**:
1. 現在日時を取得（YYYY-MM-DD形式）
2. 処方箋「日常の薬」を作成
3. 4種類の薬（朝/昼/晩/就寝前）を作成
4. 各薬にスケジュールを設定

#### ユーザー体験

**メリット**:
- ✅ 処方箋の概念を理解する前でも服薬記録を開始できる
- ✅ 新規ユーザーのオンボーディングがスムーズ
- ✅ 初期設定の手間が削減される

**柔軟性**:
- デフォルト処方箋は通常の処方箋と同じように扱える
- ユーザーが不要と判断すれば削除可能
- 薬の名前や用量を自由に編集可能

#### 注意事項

- デフォルト処方箋は一度だけ作成される（グループ作成時のみ）
- ユーザーが削除した場合は再作成しない（ユーザーの意思を尊重）
- デフォルト処方箋であることを示す特別なフラグは設けない（通常の処方箋として扱う）

### 3. 有効な薬剤の取得

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
    dosage?: {
      amount: number,
      unit: string,
    },
  }>
}
```

**計算ロジック**:
1. `isActive = true` の処方箋を取得
2. `startDate <= date` かつ `(endDate が未設定 または endDate >= date)` でフィルタ
3. 処方箋に紐付く薬とスケジュールを取得
4. 論理削除されたデータは除外

### 4. 服薬記録

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
4. 頓服は定期服用の服用率計算から除外し、別枠で実績のみを集計
5. 論理削除されたデータは除外

---

## 頓服（asNeeded）の統計

### 基本方針

頓服は「必要時に服用する」性質上、期待値（予定された服用回数）が存在しないため、定期服用とは異なる扱いをします。

### 統計への含め方

#### 1. タイミング別統計

**定期服用（morning, noon, evening, bedtime）**:
- 期待値（totalDoses）と実績を比較して服用率を計算
- 服用率 = (taken / totalDoses) × 100

**頓服（asNeeded）**:
- 別枠で実績のみを表示（「頓服（参考）」）
- 期待値なし、服用率なし
- taken, skipped, pending の実績のみをカウント

#### 2. 薬別統計（MedicineStats）

**定期服用の記録**:
- 期待値（totalDoses）と実績で服用率を計算
- 服用率 = (takenCount / totalDoses) × 100

**頓服の記録**:
- 実績のみをカウント（takenCount, skippedCount, pendingCount）
- 期待値は加算しない（totalDoses に含めない）
- 服用率は計算しない（または「N/A」と表示）
- **重要**: 薬別統計には定期服用と頓服の両方の実績を含める
  - 例: ユーザーが「ロキソニン」を定期服用と頓服の両方で使用している場合、両方の実績を合算して表示

#### 3. 全体統計

- 定期服用の統計（totalScheduled, totalTaken, totalSkipped, totalPending, adherenceRate）
- 頓服の統計（asNeeded.taken, asNeeded.skipped, asNeeded.pending, asNeeded.total）
- 両者は分けて管理・表示

### pending状態の頓服

頓服は「必要時に服用」するものなので、基本的にpending状態は想定されませんが、以下の理由で許可されています：

- ユーザーが手動でpending状態を作成できる柔軟性を維持
- pending状態の頓服も統計に含める
- ただし、特別な意味は持たない（実装上の柔軟性）

### 実装上の注意

- 頓服の記録を統計から完全に除外しない（情報価値を損なうため）
- 定期服用と頓服を明確に分けて集計する
- 頓服の記録も薬別統計に含める（ユーザーが実際に服用した薬の総量を把握するため）

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

#### 処方箋作成フォーム（PrescriptionFormWithMedicines）

**レイアウト改善（2025年11月12日更新）**:
- 「薬を追加」ボタンを下部に配置
  - 多数の薬を登録する際のスクロールの手間を削減
  - キャンセル・登録ボタンと同じ行に配置
  - 左側に配置し、右側にキャンセル・登録ボタンを配置
- 登録時の確認ダイアログを実装
  - 処方箋は作成後に編集できないため、登録前に確認を求める
  - AlertDialogコンポーネントを使用
  - 「登録後は処方箋の編集ができません。内容を確認してから登録してください。」のメッセージを表示

### 服薬記録ダッシュボード

#### 処方箋ベースの記録
- 今日有効な処方箋の薬を表示
- グループ表示（時間帯 or 処方箋）
- 服薬チェックボタン
- 記録状態の表示（pending/taken/skipped）

**時間帯ごとのまとめて操作機能（2025年11月13日追加、11月14日拡張）**:
- 時間帯ごとのグループヘッダーに「まとめて服用」「まとめてスキップ」ボタンを追加
  - 朝の薬が5つある場合など、1つ1つ押す手間を削減
  - そのグループ内の全ての薬に対して一括で記録を作成
  - 既に記録済みの薬はスキップされる
- ボタンは時間帯でグルーピングしている場合のみ表示
  - 処方箋でグルーピングしている場合は複数の時間帯が混在するため非表示
- 実装コンポーネント: `TimingGroupActions`
- **履歴画面でも利用可能**（2025年11月14日追加）
  - 過去の記録の追加にも対応
  - 編集可能な日付（今日または過去）のみボタンを表示
  - 未来の日付では非表示

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

## 薬名グルーピング機能

### 概要

薬名の表記ゆれ（例: "ロキソニン", "ロキソニン錠", "ロキソニン錠60mg"）により、統計が分散してしまう問題を解決するため、ユーザーが手動で薬名を統合できる機能。

### 目的

- 統計情報を正確に集計
- ユーザー主導のデータ品質管理
- 柔軟な薬名管理

### API

#### 薬名グループ作成
**API**: `medications.groups.mutations.createMedicineGroup`
```typescript
{
  args: {
    groupId: Id<"groups">,
    canonicalName: string,    // 代表名
    medicineNames: string[],  // 統合する薬名リスト
    notes?: string,
  },
  returns: Id<"medicineGroups">
}
```

**バリデーション**:
- 同じ薬名が複数のグループに含まれないようチェック
- 空の薬名リストは許可しない

#### 薬名グループ更新
**API**: `medications.groups.mutations.updateMedicineGroup`
```typescript
{
  args: {
    groupId: Id<"medicineGroups">,
    canonicalName?: string,
    medicineNames?: string[],
    notes?: string,
  },
  returns: void
}
```

#### 薬名グループ削除
**API**: `medications.groups.mutations.deleteMedicineGroup`
```typescript
{
  args: {
    groupId: Id<"medicineGroups">,
  },
  returns: void
}
```

#### 薬名グループ一覧取得
**API**: `medications.groups.queries.getMedicineGroups`
```typescript
{
  args: {
    groupId: Id<"groups">,
  },
  returns: Array<MedicineGroup>
}
```

#### 類似薬名検索
**API**: `medications.groups.queries.findSimilarMedicineNames`
```typescript
{
  args: {
    groupId: Id<"groups">,
    medicineName: string,
    threshold?: number,       // デフォルト: 0.6
  },
  returns: Array<{
    name: string,
    similarity: number,
  }>
}
```

**アルゴリズム**: Levenshtein距離を用いた類似度計算

### 統合の適用

統計クエリ内で `applyMedicineGrouping` ヘルパー関数を使用し、薬名グループに基づいて統計データを自動的に統合。

---

## 統計機能

### 概要

期間別の服薬統計を提供し、薬別の服薬状況、用量、服薬率を可視化。

### 目的

- 期間別の服薬状況の把握
- 薬別の服薬量と回数の追跡
- 服薬継続率の分析

### API

#### 期間別薬剤統計取得
**API**: `medications.statistics.queries.getMedicationStatsByPeriod`
```typescript
{
  args: {
    groupId: Id<"groups">,
    patientId?: string,
    medicineId?: Id<"medicines">,  // 特定の薬に絞る場合
    startDate: string,              // YYYY-MM-DD
    endDate: string,                // YYYY-MM-DD
  },
  returns: {
    medicines: Array<MedicineStats>,
    summary: {
      totalMedicines: number,
      totalDoses: number,
      totalTaken: number,
      totalSkipped: number,
      totalPending: number,
      overallAdherenceRate: number,
    },
    period: {
      startDate: string,
      endDate: string,
      days: number,
    },
  }
}
```

**MedicineStats型**:
```typescript
interface MedicineStats {
  medicineId?: Id<"medicines">,
  medicineName: string,
  totalAmount: number,           // 合計用量
  unit: string,                  // 単位
  totalDoses: number,            // 合計服用予定回数
  takenCount: number,            // 実際に服用した回数
  skippedCount: number,          // スキップした回数
  pendingCount: number,          // 未記録の回数
  adherenceRate: number,         // 服用率（%）
}
```

### 計算ロジック

1. **期間内の日付を生成**: `generateDateRange` で全日付を列挙
2. **各日の有効な処方箋を取得**: `isDateInRange` で処方箋の有効性を判定
3. **期待値を計算**: 各日の薬ごとのタイミング数を集計（頓服を除く）
4. **実際の記録を取得**: 期間内の服薬記録を集計
5. **薬名グルーピングを適用**: `applyMedicineGrouping` で統計を統合
6. **服薬率を計算**: `takenCount / totalDoses * 100`

### ヘルパー関数

#### applyMedicineGrouping
```typescript
async function applyMedicineGrouping(
  ctx: QueryCtx,
  groupId: Id<"groups">,
  stats: Record<string, MedicineStats>,
): Promise<Record<string, MedicineStats>>
```

**処理内容**:
- 薬名グループ設定を取得
- グループ内の薬の統計を統合
- 単位の不一致を警告
- 服薬率を再計算

#### generateDateRange
```typescript
function generateDateRange(startDate: string, endDate: string): string[]
```

**処理内容**: 開始日から終了日までの日付配列を生成

#### isDateInRange
```typescript
function isDateInRange(
  date: string,
  startDate: string,
  endDate?: string,
): boolean
```

**処理内容**: 指定日が処方箋の有効期間内かを判定

### UI コンポーネント

#### 統計ページ (`/statistics`)
- 期間選択（クイックプリセット + カスタム日付）
- サマリー表示（合計薬数、服薬回数、服薬率）
- 薬別統計リスト（用量、回数、服薬率）
- 類似薬名警告
- 薬名統合ダイアログ

#### PeriodSelector
- 過去7日、過去30日、今月、先月のクイックプリセット
- カスタム開始日・終了日入力

#### StatsSummary
- 合計薬数、合計服用予定回数、実際に服用した回数
- スキップした回数、未記録の回数
- 全体の服薬率（プログレスバー表示）

#### MedicineStatsList
- 薬別の詳細統計（用量、回数、服薬率）
- 類似薬名がある場合の警告表示
- 統合ボタンで MedicineGroupDialog を開く

#### MedicineGroupDialog
- 代表名入力
- 統合する薬名の選択（チェックボックス）
- カスタム薬名追加
- 統合実行

### 注意事項

- 頓服（asNeeded）は定期服用の服用率計算から除外されるが、薬別統計の実績には含まれる
- 単位の不一致がある場合は警告を表示
- グルーピング適用後は元の薬名ごとの統計は表示されない

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
- [服薬統計機能とデータ品質管理 ADR](../../decisions/2025-10-26-medication-statistics.md)
