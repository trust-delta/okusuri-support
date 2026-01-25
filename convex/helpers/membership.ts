import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { error, type Result, success } from "../types/result";

type DbCtx = QueryCtx | MutationCtx;

/**
 * メンバーシップ検索オプション
 */
export interface MembershipOptions {
  /** 脱退済みメンバーを除外するか（デフォルト: true） */
  activeOnly?: boolean;
}

/**
 * ユーザーのグループメンバーシップを取得（null許容）
 * query向け: nullや空配列を返したい場合に使用
 *
 * Note: groupMembersテーブルのuserIdは文字列として保存されているため、
 * Id<"users">を文字列に変換して検索します。
 *
 * @example
 * ```typescript
 * const membership = await getMembership(ctx, userId, groupId);
 * if (!membership) {
 *   return null;
 * }
 * ```
 */
export async function getMembership(
  ctx: DbCtx,
  userId: Id<"users"> | string,
  groupId: Id<"groups">,
  options: MembershipOptions = {},
): Promise<Doc<"groupMembers"> | null> {
  const { activeOnly = true } = options;
  // groupMembersテーブルのuserIdは文字列として保存されている
  const userIdString = typeof userId === "string" ? userId : String(userId);

  let query = ctx.db
    .query("groupMembers")
    .withIndex("by_userId", (q) => q.eq("userId", userIdString))
    .filter((q) => q.eq(q.field("groupId"), groupId));

  if (activeOnly) {
    query = query.filter((q) => q.eq(q.field("leftAt"), undefined));
  }

  return await query.first();
}

/**
 * ユーザーのグループメンバーシップを取得（エラー時はResult型でエラーを返す）
 * mutation/action向け: Result型でエラーを返したい場合に使用
 *
 * @example
 * ```typescript
 * const membershipResult = await requireMembership(ctx, userId, groupId);
 * if (!membershipResult.isSuccess) return membershipResult;
 * const membership = membershipResult.data;
 * ```
 */
export async function requireMembership(
  ctx: DbCtx,
  userId: Id<"users"> | string,
  groupId: Id<"groups">,
  options: MembershipOptions = {},
): Promise<Result<Doc<"groupMembers">>> {
  const membership = await getMembership(ctx, userId, groupId, options);

  if (!membership) {
    return error("このグループのメンバーではありません");
  }

  return success(membership);
}

/**
 * 認証+メンバーシップを一度に確認（最も頻出するパターン）
 * mutation/action向け: 認証確認とメンバーシップ確認を同時に行いたい場合に使用
 *
 * @example
 * ```typescript
 * const authResult = await requireAuthAndMembership(ctx, args.groupId);
 * if (!authResult.isSuccess) return authResult;
 * const { userId, membership } = authResult.data;
 * ```
 */
export async function requireAuthAndMembership(
  ctx: DbCtx,
  groupId: Id<"groups">,
  options: MembershipOptions = {},
): Promise<Result<{ userId: Id<"users">; membership: Doc<"groupMembers"> }>> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    return error("認証が必要です");
  }

  const membershipResult = await requireMembership(
    ctx,
    userId,
    groupId,
    options,
  );
  if (!membershipResult.isSuccess) {
    return membershipResult;
  }

  return success({ userId, membership: membershipResult.data });
}

/**
 * ユーザーがグループメンバーかどうかを判定（boolean返却）
 * 条件分岐で使用する場合に使用
 *
 * @example
 * ```typescript
 * const isMember = await isGroupMember(ctx, userId, groupId);
 * if (!isMember) {
 *   // メンバーではない場合の処理
 * }
 * ```
 */
export async function isGroupMember(
  ctx: DbCtx,
  userId: Id<"users"> | string,
  groupId: Id<"groups">,
  options: MembershipOptions = {},
): Promise<boolean> {
  const membership = await getMembership(ctx, userId, groupId, options);
  return membership !== null;
}
