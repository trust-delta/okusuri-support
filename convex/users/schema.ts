import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * ユーザー関連のスキーマ定義
 * Convex Authの標準フィールド + カスタムフィールド
 */
export const usersSchema = {
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    displayName: v.optional(v.string()), // ユーザー表示名（全グループ共通）
    customImageStorageId: v.optional(v.id("_storage")), // カスタムアップロード画像のストレージID
    activeGroupId: v.optional(v.id("groups")), // アクティブなグループID
  }).index("email", ["email"]),
};
