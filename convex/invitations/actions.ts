import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { action } from "../_generated/server";
import { error, type Result } from "../types/result";

/**
 * 招待コードを生成
 * 認証済みユーザーのみ呼び出し可能
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
    // 0. 認証チェック（早期に失敗させてリソース節約）
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return error("認証が必要です");
    }

    // 最大3回試行
    const maxAttempts = 3;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // 1. 暗号学的に安全な招待コード生成（内部アクション）
      const code: string = await ctx.runAction(
        internal["invitation-code-generator"].generateInvitationCodeAction,
      );

      // 2. 招待レコード作成（内部mutation）
      const result = await ctx.runMutation(
        internal.invitations.createInvitationInternal,
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
