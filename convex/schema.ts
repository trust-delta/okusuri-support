import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { groupsSchema } from "./groups/schema";
import { invitationsSchema } from "./invitations/schema";
import { medicinesSchema } from "./medications/schema";

export default defineSchema({
  ...authTables,
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
  }).index("email", ["email"]),

  // グループ関連のスキーマ
  ...groupsSchema,

  // 招待関連のスキーマ
  ...invitationsSchema,

  // 薬剤・服薬記録関連のスキーマ
  ...medicinesSchema,
});
