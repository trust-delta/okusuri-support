import type { Doc, Id, TableNames } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { error, type Result, success } from "../types/result";

type DbCtx = QueryCtx | MutationCtx;

/**
 * 論理削除フィールドを持つドキュメント
 */
interface SoftDeletable {
  deletedAt?: number;
  deletedBy?: string;
}

/**
 * エンティティを取得（存在しない場合はResult型でエラーを返す）
 *
 * @example
 * ```typescript
 * const result = await requireEntity(ctx, args.groupId, "グループ");
 * if (!result.isSuccess) return result;
 * const group = result.data;
 * ```
 */
export async function requireEntity<T extends TableNames>(
  ctx: DbCtx,
  id: Id<T>,
  entityName: string,
): Promise<Result<Doc<T>>> {
  const entity = await ctx.db.get(id);
  if (!entity) {
    return error(`${entityName}が見つかりません`);
  }
  return success(entity);
}

/**
 * エンティティを取得し、削除済みでないことを確認
 *
 * @example
 * ```typescript
 * const result = await requireActiveEntity(ctx, args.groupId, "グループ");
 * if (!result.isSuccess) return result;
 * const group = result.data;
 * ```
 */
export async function requireActiveEntity<T extends TableNames>(
  ctx: DbCtx,
  id: Id<T>,
  entityName: string,
  deletedMessage?: string,
): Promise<Result<Doc<T>>> {
  const entityResult = await requireEntity(ctx, id, entityName);
  if (!entityResult.isSuccess) {
    return entityResult;
  }

  const entity = entityResult.data as Doc<T> & SoftDeletable;
  if (entity.deletedAt !== undefined) {
    return error(deletedMessage ?? `この${entityName}は削除されています`);
  }

  return entityResult;
}

/**
 * グループを取得し、削除済みでないことを確認
 *
 * @example
 * ```typescript
 * const result = await requireActiveGroup(ctx, args.groupId);
 * if (!result.isSuccess) return result;
 * const group = result.data;
 * ```
 */
export async function requireActiveGroup(
  ctx: DbCtx,
  groupId: Id<"groups">,
): Promise<Result<Doc<"groups">>> {
  return requireActiveEntity(
    ctx,
    groupId,
    "グループ",
    "このグループは削除されています",
  );
}

/**
 * 薬を取得し、削除済みでないことを確認
 *
 * @example
 * ```typescript
 * const result = await requireActiveMedicine(ctx, args.medicineId);
 * if (!result.isSuccess) return result;
 * const medicine = result.data;
 * ```
 */
export async function requireActiveMedicine(
  ctx: DbCtx,
  medicineId: Id<"medicines">,
): Promise<Result<Doc<"medicines">>> {
  return requireActiveEntity(
    ctx,
    medicineId,
    "薬",
    "この薬は既に削除されています",
  );
}

/**
 * 処方箋を取得し、削除済みでないことを確認
 *
 * @example
 * ```typescript
 * const result = await requireActivePrescription(ctx, args.prescriptionId);
 * if (!result.isSuccess) return result;
 * const prescription = result.data;
 * ```
 */
export async function requireActivePrescription(
  ctx: DbCtx,
  prescriptionId: Id<"prescriptions">,
): Promise<Result<Doc<"prescriptions">>> {
  return requireActiveEntity(
    ctx,
    prescriptionId,
    "処方箋",
    "この処方箋は削除されています",
  );
}

/**
 * エンティティが削除済みかどうかを判定
 *
 * @example
 * ```typescript
 * if (isDeleted(entity)) {
 *   return error("削除済みです");
 * }
 * ```
 */
export function isDeleted<T extends SoftDeletable>(
  entity: T | null | undefined,
): boolean {
  return (
    entity === null || entity === undefined || entity.deletedAt !== undefined
  );
}

/**
 * エンティティがアクティブ（削除されていない）かどうかを判定
 *
 * @example
 * ```typescript
 * if (!isActive(entity)) {
 *   return error("削除済みです");
 * }
 * ```
 */
export function isActive<T extends SoftDeletable>(
  entity: T | null | undefined,
): entity is T {
  return (
    entity !== null && entity !== undefined && entity.deletedAt === undefined
  );
}
