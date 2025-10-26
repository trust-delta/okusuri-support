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
};
