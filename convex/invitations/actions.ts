import { v } from "convex/values";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { action } from "../_generated/server";

/**
 * 招待コードを生成
 */
export const createInvitation = action({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    invitationId: Id<"groupInvitations">;
    code: string;
    expiresAt: number;
    allowedRoles: ("patient" | "supporter")[];
    invitationLink: string;
  }> => {
    // 最大3回試行
    const maxAttempts = 3;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // 1. 暗号学的に安全な招待コード生成
      const code: string = await ctx.runAction(
        api.invitations.generateInvitationCodeAction,
      );

      try {
        // 2. 招待レコード作成
        const result = await ctx.runMutation(
          api.invitations.createInvitationInternal,
          {
            groupId: args.groupId,
            code,
          },
        );

        return result;
      } catch (error) {
        // コード重複の場合は再試行
        if (error instanceof Error && error.message.includes("重複")) {
          continue;
        }
        throw error;
      }
    }

    throw new Error(
      "招待コードの生成に失敗しました。3回試行しても一意なコードを生成できませんでした。",
    );
  },
});
