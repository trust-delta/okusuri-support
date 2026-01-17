import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * グループ関連のスキーマ定義
 */
export const groupsSchema = {
  groups: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.string(), // Convex AuthのuserIdを文字列として保存
    createdAt: v.number(),
    deletedAt: v.optional(v.number()), // グループ削除日時（論理削除）
    deletedBy: v.optional(v.string()), // 削除実行者のuserId
  }),

  groupMembers: defineTable({
    groupId: v.id("groups"),
    userId: v.string(), // Convex AuthのuserIdを文字列として保存
    role: v.union(v.literal("patient"), v.literal("supporter")),
    joinedAt: v.number(),
    leftAt: v.optional(v.number()), // 脱退日時（論理削除）
    leftBy: v.optional(v.string()), // 脱退実行者のuserId
  })
    .index("by_userId", ["userId"])
    .index("by_groupId", ["groupId"])
    .index("by_groupId_leftAt", ["groupId", "leftAt"]),

  // グループ通知設定: グループ単位の通知時刻設定
  groupNotificationSettings: defineTable({
    groupId: v.id("groups"),
    morningTime: v.number(), // 分単位 (0-1439)、デフォルト: 480 (8:00)
    noonTime: v.number(), // デフォルト: 720 (12:00)
    eveningTime: v.number(), // デフォルト: 1080 (18:00)
    bedtimeTime: v.number(), // デフォルト: 1260 (21:00)
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_groupId", ["groupId"]),
};
