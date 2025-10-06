import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  groups: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.string(), // Convex AuthのuserIdを文字列として保存
    createdAt: v.number(),
  }),

  groupMembers: defineTable({
    groupId: v.id("groups"),
    userId: v.string(), // Convex AuthのuserIdを文字列として保存
    displayName: v.optional(v.string()), // ユーザー表示名
    role: v.union(v.literal("patient"), v.literal("supporter")),
    joinedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_groupId", ["groupId"]),

  // 薬剤マスタ: グループ内で管理する薬剤情報
  medicines: defineTable({
    groupId: v.id("groups"),
    name: v.string(), // 薬剤名
    description: v.optional(v.string()), // 備考・説明
    createdBy: v.string(), // Convex AuthのuserIdを文字列として保存
    createdAt: v.number(),
    isActive: v.boolean(), // 服用中かどうか
  })
    .index("by_groupId", ["groupId"])
    .index("by_groupId_isActive", ["groupId", "isActive"]),

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
    dosage: v.optional(v.string()), // 用量 (例: "1錠", "2カプセル")
    notes: v.optional(v.string()), // メモ
    createdBy: v.string(), // Convex AuthのuserIdを文字列として保存
    createdAt: v.number(),
    updatedAt: v.number(),
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
});
