import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";
import { error, type Result, success } from "../types/result";

type AnyCtx = QueryCtx | MutationCtx | ActionCtx;

/**
 * 認証済みユーザーIDを取得（エラー時はResult型でエラーを返す）
 * mutation/action向け: Result型でエラーを返したい場合に使用
 *
 * @example
 * ```typescript
 * const authResult = await requireAuth(ctx);
 * if (!authResult.isSuccess) return authResult;
 * const userId = authResult.data;
 * ```
 */
export async function requireAuth(ctx: AnyCtx): Promise<Result<Id<"users">>> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    return error("認証が必要です");
  }
  return success(userId);
}

/**
 * 認証済みユーザーIDを取得（未認証時はnullを返す）
 * query向け: 空配列やnullを返したい場合に使用
 *
 * @example
 * ```typescript
 * const userId = await getAuthenticatedUserId(ctx);
 * if (!userId) {
 *   return null; // または []
 * }
 * ```
 */
export async function getAuthenticatedUserId(
  ctx: AnyCtx,
): Promise<Id<"users"> | null> {
  return await getAuthUserId(ctx);
}
