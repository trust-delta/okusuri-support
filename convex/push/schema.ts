import { defineTable } from "convex/server";
import { v } from "convex/values";

export const pushSchema = {
  pushSubscriptions: defineTable({
    userId: v.string(), // Convex Auth userId
    groupId: v.id("groups"),
    endpoint: v.string(), // プッシュサービスのエンドポイント
    keys: v.object({
      p256dh: v.string(), // クライアント公開鍵
      auth: v.string(), // 認証シークレット
    }),
    userAgent: v.optional(v.string()), // ブラウザ情報（デバッグ用）
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_groupId", ["groupId"])
    .index("by_endpoint", ["endpoint"]),
};
