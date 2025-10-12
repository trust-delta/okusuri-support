import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation } from "../_generated/server";

/**
 * 招待コードを生成（内部mutation）
 */
export const createInvitationInternal = mutation({
  args: {
    groupId: v.id("groups"),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. 認証確認
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("認証が必要です");
    }

    // 2. グループメンバーシップ確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), args.groupId))
      .first();

    if (!membership) {
      throw new Error("このグループのメンバーではありません");
    }

    // 3. Patient在籍状況確認
    const patientMember = await ctx.db
      .query("groupMembers")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .filter((q) => q.eq(q.field("role"), "patient"))
      .first();

    // 4. 許可ロール決定
    const allowedRoles: ("patient" | "supporter")[] = patientMember
      ? ["supporter"] // Patient存在時はSupporterのみ
      : ["patient", "supporter"]; // Patient不在時は両方

    // 5. コードの一意性確認
    const existing = await ctx.db
      .query("groupInvitations")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (existing) {
      throw new Error("招待コードが重複しています");
    }

    // 6. 有効期限設定（7日後）
    const now = Date.now();
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    const expiresAt = now + sevenDaysInMs;

    // 7. 招待レコード挿入
    const invitationId = await ctx.db.insert("groupInvitations", {
      code: args.code,
      groupId: args.groupId,
      createdBy: userId,
      createdAt: now,
      expiresAt,
      allowedRoles,
      isUsed: false,
    });

    const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invite/${args.code}`;

    return {
      invitationId,
      code: args.code,
      expiresAt,
      allowedRoles,
      invitationLink,
    };
  },
});
