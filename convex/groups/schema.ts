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
  }),

  groupMembers: defineTable({
    groupId: v.id("groups"),
    userId: v.string(), // Convex AuthのuserIdを文字列として保存
    role: v.union(v.literal("patient"), v.literal("supporter")),
    joinedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_groupId", ["groupId"]),
};
