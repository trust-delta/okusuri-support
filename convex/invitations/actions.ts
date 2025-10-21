import { v } from "convex/values";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { action } from "../_generated/server";
import { error, type Result } from "../shared/types/result";

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
  ): Promise<
    Result<{
      invitationId: Id<"groupInvitations">;
      code: string;
      expiresAt: number;
      allowedRoles: ("patient" | "supporter")[];
      invitationLink: string;
    }>
  > => {
    // 最大3回試行
    const maxAttempts = 3;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // 1. 暗号学的に安全な招待コード生成
      const code: string = await ctx.runAction(
        api.invitationCodeGenerator.generateInvitationCodeAction,
      );

      // 2. 招待レコード作成
      const result = await ctx.runMutation(
        api.invitations.createInvitationInternal,
        {
          groupId: args.groupId,
          code,
        },
      );

      // Result型のハンドリング
      if (!result.isSuccess) {
        // コード重複の場合は再試行
        if (result.errorMessage.includes("重複")) {
          continue;
        }
        // それ以外のエラーはそのまま返す
        return result;
      }

      // 成功したら結果を返す
      return result;
    }

    return error(
      "招待コードの生成に失敗しました。3回試行しても一意なコードを生成できませんでした。",
    );
  },
});
