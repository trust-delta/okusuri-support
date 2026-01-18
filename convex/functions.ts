/**
 * Zod バリデーション付きカスタム関数ビルダー
 *
 * convex-helpers を使用して、Zod スキーマによる境界バリデーションを提供します。
 * フロントエンドと同じ Zod スキーマを使用することで、型安全性を向上させます。
 */
import { NoOp } from "convex-helpers/server/customFunctions";
import {
  zCustomAction,
  zCustomMutation,
  zCustomQuery,
  zid,
} from "convex-helpers/server/zod4";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";

/**
 * Zod バリデーション付き query ビルダー
 *
 * @example
 * ```ts
 * import { z } from "zod/v4";
 * import { zQuery, zid } from "@/convex/functions";
 *
 * export const getGroup = zQuery({
 *   args: {
 *     groupId: zid("groups"),
 *   },
 *   handler: async (ctx, args) => {
 *     return await ctx.db.get(args.groupId);
 *   },
 * });
 * ```
 */
export const zQuery = zCustomQuery(query, NoOp);

/**
 * Zod バリデーション付き mutation ビルダー
 *
 * @example
 * ```ts
 * import { z } from "zod/v4";
 * import { zMutation, zid } from "@/convex/functions";
 *
 * export const updateGroup = zMutation({
 *   args: {
 *     groupId: zid("groups"),
 *     name: z.string().min(1).max(100),
 *   },
 *   handler: async (ctx, args) => {
 *     await ctx.db.patch(args.groupId, { name: args.name });
 *   },
 * });
 * ```
 */
export const zMutation = zCustomMutation(mutation, NoOp);

/**
 * Zod バリデーション付き action ビルダー
 */
export const zAction = zCustomAction(action, NoOp);

/**
 * Zod バリデーション付き internalQuery ビルダー
 */
export const zInternalQuery = zCustomQuery(internalQuery, NoOp);

/**
 * Zod バリデーション付き internalMutation ビルダー
 */
export const zInternalMutation = zCustomMutation(internalMutation, NoOp);

/**
 * Zod バリデーション付き internalAction ビルダー
 */
export const zInternalAction = zCustomAction(internalAction, NoOp);

/**
 * Convex Document ID 用の Zod バリデーター
 * テーブル名を指定することで、正しいテーブルの ID であることを保証します
 *
 * @example
 * ```ts
 * import { zid } from "@/convex/functions";
 *
 * const args = {
 *   groupId: zid("groups"),
 *   userId: zid("users"),
 * };
 * ```
 */
export { zid };
