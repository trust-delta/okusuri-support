import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * 薬剤・服薬記録関連のスキーマ定義
 */
export const medicinesSchema = {
  // 処方箋: 薬の有効期間を管理
  prescriptions: defineTable({
    groupId: v.id("groups"),
    name: v.string(), // 処方箋名（例: "10月分の処方箋"、"内科の風邪薬"）
    startDate: v.string(), // YYYY-MM-DD形式
    endDate: v.optional(v.string()), // YYYY-MM-DD形式（未指定 = 継続中）
    isActive: v.boolean(), // 処方箋が有効かどうか（期間外でも手動で無効化可能）
    notes: v.optional(v.string()), // メモ（医療機関名、処方目的など）
    imageId: v.optional(v.id("_storage")), // 処方箋画像のストレージID
    createdBy: v.string(), // Convex AuthのuserIdを文字列として保存
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()), // 論理削除日時
    deletedBy: v.optional(v.string()), // 削除者のConvex AuthユーザーID
  })
    .index("by_groupId", ["groupId"])
    .index("by_groupId_isActive", ["groupId", "isActive"])
    .index("by_groupId_startDate", ["groupId", "startDate"])
    .index("by_groupId_deletedAt", ["groupId", "deletedAt"]),

  // 薬剤マスタ: グループ内で管理する薬剤情報
  medicines: defineTable({
    groupId: v.id("groups"),
    prescriptionId: v.optional(v.id("prescriptions")), // 処方箋ID（移行期間中はoptional）
    name: v.string(), // 薬剤名
    description: v.optional(v.string()), // 備考・説明
    createdBy: v.string(), // Convex AuthのuserIdを文字列として保存
    createdAt: v.number(),
    deletedAt: v.optional(v.number()), // 論理削除日時
    deletedBy: v.optional(v.string()), // 削除者のConvex AuthユーザーID
  })
    .index("by_groupId", ["groupId"])
    .index("by_prescriptionId", ["prescriptionId"]),

  // 服薬スケジュール: 各薬剤の服用タイミング設定
  medicationSchedules: defineTable({
    medicineId: v.id("medicines"),
    groupId: v.id("groups"),
    // 服用タイミング (複数選択可能)
    timings: v.array(
      v.union(
        v.literal("morning"), // 朝
        v.literal("noon"), // 昼
        v.literal("evening"), // 晩
        v.literal("bedtime"), // 就寝前
        v.literal("asNeeded"), // 頓服
      ),
    ),
    // 用量（数値化）
    dosage: v.optional(
      v.object({
        amount: v.number(), // 数値（例: 10, 1.5）
        unit: v.string(), // 単位（例: "mg", "錠", "mL", "カプセル", "g"）
      }),
    ),
    notes: v.optional(v.string()), // メモ
    createdBy: v.string(), // Convex AuthのuserIdを文字列として保存
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()), // 論理削除日時
    deletedBy: v.optional(v.string()), // 削除者のConvex AuthユーザーID
  })
    .index("by_medicineId", ["medicineId"])
    .index("by_groupId", ["groupId"]),

  // 服薬記録: 実際の服薬記録（最新状態のみ）
  medicationRecords: defineTable({
    medicineId: v.optional(v.id("medicines")), // 薬剤登録済みの場合に設定
    scheduleId: v.optional(v.id("medicationSchedules")), // スケジュール登録済みの場合に設定
    simpleMedicineName: v.optional(v.string()), // 薬剤未登録時の表示名（例: "朝の薬"）
    groupId: v.id("groups"),
    patientId: v.string(), // 服薬者のConvex AuthユーザーID
    timing: v.union(
      v.literal("morning"),
      v.literal("noon"),
      v.literal("evening"),
      v.literal("bedtime"),
      v.literal("asNeeded"),
    ),
    scheduledDate: v.string(), // 予定日 (YYYY-MM-DD形式)
    takenAt: v.optional(v.number()), // 実際に服用した日時 (timestamp)
    status: v.union(
      v.literal("pending"), // 未服用
      v.literal("taken"), // 服用済み
      v.literal("skipped"), // スキップ
    ),
    recordedBy: v.string(), // 記録者 Convex AuthユーザーID (服薬者本人またはサポーター)
    notes: v.optional(v.string()), // メモ
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()), // 論理削除日時
    deletedBy: v.optional(v.string()), // 削除者のConvex AuthユーザーID
  })
    .index("by_groupId", ["groupId"])
    .index("by_patientId", ["patientId"])
    .index("by_scheduleId", ["scheduleId"])
    .index("by_scheduledDate", ["scheduledDate"])
    .index("by_groupId_scheduledDate", ["groupId", "scheduledDate"])
    .index("by_patientId_scheduledDate", ["patientId", "scheduledDate"])
    .index("by_status", ["status"])
    .index("by_patientId_timing_scheduledDate", [
      "patientId",
      "timing",
      "scheduledDate",
    ]),

  // 服薬記録履歴: 削除・編集前の全ての履歴を保存
  medicationRecordsHistory: defineTable({
    originalRecordId: v.id("medicationRecords"), // 元のレコードID
    medicineId: v.optional(v.id("medicines")),
    scheduleId: v.optional(v.id("medicationSchedules")),
    simpleMedicineName: v.optional(v.string()),
    groupId: v.id("groups"),
    patientId: v.string(),
    timing: v.union(
      v.literal("morning"),
      v.literal("noon"),
      v.literal("evening"),
      v.literal("bedtime"),
      v.literal("asNeeded"),
    ),
    scheduledDate: v.string(),
    takenAt: v.optional(v.number()),
    status: v.union(
      v.literal("pending"),
      v.literal("taken"),
      v.literal("skipped"),
    ),
    recordedBy: v.string(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    // 履歴メタデータ
    historyType: v.union(
      v.literal("deleted"), // 削除によるアーカイブ
      v.literal("updated"), // 更新によるアーカイブ
    ),
    archivedAt: v.number(), // 履歴に移動した日時
    archivedBy: v.string(), // 履歴に移動した実行者のConvex Auth ユーザーID
  })
    .index("by_originalRecordId", ["originalRecordId"])
    .index("by_groupId", ["groupId"])
    .index("by_patientId", ["patientId"])
    .index("by_archivedAt", ["archivedAt"]), // 特定タイミングの記録を効率的に取得

  // 薬名統合グループ: 表記ゆれを統合するための設定
  medicineGroups: defineTable({
    groupId: v.id("groups"),
    canonicalName: v.string(), // 代表名（例: "ロキソニン"）
    medicineNames: v.array(v.string()), // 統合する薬名リスト
    notes: v.optional(v.string()), // メモ
    createdBy: v.string(), // Convex AuthのuserIdを文字列として保存
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_groupId", ["groupId"]),

  // ========================================
  // 残量管理機能
  // ========================================

  // 薬在庫: 薬ごとの残量を管理
  medicineInventory: defineTable({
    medicineId: v.id("medicines"), // 薬への参照
    groupId: v.id("groups"), // グループID
    currentQuantity: v.number(), // 現在の残量
    unit: v.string(), // 単位（錠、カプセル、mL等）
    warningThreshold: v.optional(v.number()), // 警告閾値（この数量以下で警告）
    isTrackingEnabled: v.boolean(), // 残量追跡が有効か
    createdBy: v.string(), // Convex Auth userId
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_medicineId", ["medicineId"])
    .index("by_groupId", ["groupId"])
    .index("by_groupId_isTrackingEnabled", ["groupId", "isTrackingEnabled"]),

  // 消費記録: 薬の消費・補充を記録
  medicineConsumptionRecords: defineTable({
    medicineId: v.id("medicines"), // 薬への参照
    inventoryId: v.id("medicineInventory"), // 在庫への参照
    groupId: v.id("groups"), // グループID
    patientId: v.string(), // 患者ID（服薬者）
    consumptionType: v.union(
      v.literal("scheduled"), // 予定通りの服薬（medicationRecordsと連動）
      v.literal("extra"), // 追加服用（予定外、多く飲んだ）
      v.literal("lost"), // 紛失
      v.literal("adjustment"), // 調整（棚卸し等）
      v.literal("refill"), // 補充（処方箋受け取り等）
    ),
    quantity: v.number(), // 消費量（正: 消費、負: 補充）
    quantityBefore: v.number(), // 変更前の残量
    quantityAfter: v.number(), // 変更後の残量
    relatedRecordId: v.optional(v.id("medicationRecords")), // 関連する服薬記録
    reason: v.optional(v.string()), // 理由・備考
    recordedBy: v.string(), // 記録者
    recordedAt: v.number(), // 記録日時
    createdAt: v.number(),
  })
    .index("by_medicineId", ["medicineId"])
    .index("by_inventoryId", ["inventoryId"])
    .index("by_groupId", ["groupId"])
    .index("by_consumptionType", ["consumptionType"])
    .index("by_recordedAt", ["recordedAt"])
    .index("by_groupId_recordedAt", ["groupId", "recordedAt"]),

  // 在庫アラート: 残量不足・予定外消費の警告
  inventoryAlerts: defineTable({
    inventoryId: v.id("medicineInventory"), // 在庫への参照
    groupId: v.id("groups"), // グループID
    alertType: v.union(
      v.literal("low_stock"), // 残量不足（警告閾値以下）
      v.literal("out_of_stock"), // 在庫切れ（残量0、処方箋継続中）
      v.literal("unexpected_consumption"), // 予定外消費（extra, lost）
      v.literal("overdose_warning"), // 過剰服用警告
    ),
    severity: v.union(
      v.literal("info"),
      v.literal("warning"),
      v.literal("critical"),
    ),
    message: v.string(), // アラートメッセージ
    relatedConsumptionId: v.optional(v.id("medicineConsumptionRecords")),
    medicineName: v.string(), // 薬名（表示用）
    isRead: v.boolean(), // 既読フラグ
    readBy: v.optional(v.string()), // 既読者
    readAt: v.optional(v.number()), // 既読日時
    createdAt: v.number(),
  })
    .index("by_inventoryId", ["inventoryId"])
    .index("by_groupId", ["groupId"])
    .index("by_groupId_isRead", ["groupId", "isRead"])
    .index("by_alertType", ["alertType"])
    .index("by_createdAt", ["createdAt"]),
};
