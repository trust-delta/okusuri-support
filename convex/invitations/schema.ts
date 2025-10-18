import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * グループ招待関連のスキーマ定義
 * 招待コードによるグループ参加管理
 */
export const invitationsSchema = {
  groupInvitations: defineTable({
    code: v.string(), // 招待コード（8文字英数字、一意）
    groupId: v.id("groups"), // 対象グループ
    createdBy: v.string(), // 作成者のuserId
    createdAt: v.number(), // 作成日時（timestamp）
    expiresAt: v.number(), // 有効期限（timestamp、createdAt + 7日）
    allowedRoles: v.array(
      // 招待可能ロール
      v.union(v.literal("patient"), v.literal("supporter")),
    ),
    isUsed: v.boolean(), // 使用済みフラグ
    usedBy: v.optional(v.string()), // 使用者のuserId
    usedAt: v.optional(v.number()), // 使用日時（timestamp）
  })
    .index("by_code", ["code"]) // コード検索用（一意制約）
    .index("by_groupId", ["groupId"]) // グループ別招待一覧
    .index("by_groupId_isUsed", ["groupId", "isUsed"]), // 有効招待フィルタリング
};
