/**
 * 共通ヘルパー関数
 *
 * バックエンドの重複コードを削減するための共通関数を提供します。
 *
 * @example
 * ```typescript
 * import {
 *   requireAuth,
 *   requireAuthAndMembership,
 *   requireActiveGroup,
 * } from "../helpers";
 *
 * export const updateGroup = zMutation({
 *   handler: async (ctx, args): Promise<Result<void>> => {
 *     // グループ存在・削除チェック
 *     const groupResult = await requireActiveGroup(ctx, args.groupId);
 *     if (!groupResult.isSuccess) return groupResult;
 *
 *     // 認証+メンバーシップ確認
 *     const authResult = await requireAuthAndMembership(ctx, args.groupId);
 *     if (!authResult.isSuccess) return authResult;
 *
 *     const { userId, membership } = authResult.data;
 *     // ...
 *   },
 * });
 * ```
 */

// 認証関連
export { getAuthenticatedUserId, requireAuth } from "./auth";
// バッチ取得関連
export {
  batchGetDocuments,
  batchGetMedicinesByGroupId,
  batchGetMedicinesByPrescriptionIds,
  batchGetSchedulesByGroupId,
  batchGetSchedulesByMedicineIds,
} from "./batch";
// エンティティ関連
export {
  isActive,
  isDeleted,
  requireActiveEntity,
  requireActiveGroup,
  requireActiveMedicine,
  requireActivePrescription,
  requireEntity,
} from "./entity";
export type { MembershipOptions } from "./membership";
// メンバーシップ関連
export {
  getMembership,
  isGroupMember,
  requireAuthAndMembership,
  requireMembership,
} from "./membership";
