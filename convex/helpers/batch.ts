import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type DbCtx = QueryCtx | MutationCtx;

/**
 * 複数の薬IDからスケジュールを一括取得
 * @returns Map<medicineId, schedule>
 */
export async function batchGetSchedulesByMedicineIds(
  ctx: DbCtx,
  medicineIds: Id<"medicines">[],
): Promise<Map<string, Doc<"medicationSchedules">>> {
  const scheduleMap = new Map<string, Doc<"medicationSchedules">>();

  if (medicineIds.length === 0) {
    return scheduleMap;
  }

  // 全スケジュールを取得してフィルター
  // Note: Convexでは IN 句がないため、groupIdで絞り込むか、全件取得してフィルターする
  // medicineIdsからユニークなIDセットを作成
  const medicineIdSet = new Set(medicineIds.map((id) => String(id)));

  // 各薬のスケジュールを取得
  for (const medicineId of medicineIds) {
    const schedule = await ctx.db
      .query("medicationSchedules")
      .withIndex("by_medicineId", (q) => q.eq("medicineId", medicineId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .first();

    if (schedule) {
      scheduleMap.set(String(medicineId), schedule);
    }
  }

  return scheduleMap;
}

/**
 * グループIDから全スケジュールを一括取得
 * @returns Map<medicineId, schedule>
 */
export async function batchGetSchedulesByGroupId(
  ctx: DbCtx,
  groupId: Id<"groups">,
): Promise<Map<string, Doc<"medicationSchedules">>> {
  const scheduleMap = new Map<string, Doc<"medicationSchedules">>();

  const schedules = await ctx.db
    .query("medicationSchedules")
    .withIndex("by_groupId", (q) => q.eq("groupId", groupId))
    .filter((q) => q.eq(q.field("deletedAt"), undefined))
    .collect();

  for (const schedule of schedules) {
    scheduleMap.set(String(schedule.medicineId), schedule);
  }

  return scheduleMap;
}

/**
 * 複数の処方箋IDから薬を一括取得
 * @returns Map<prescriptionId, medicines[]>
 */
export async function batchGetMedicinesByPrescriptionIds(
  ctx: DbCtx,
  prescriptionIds: Id<"prescriptions">[],
): Promise<Map<string, Doc<"medicines">[]>> {
  const medicinesMap = new Map<string, Doc<"medicines">[]>();

  if (prescriptionIds.length === 0) {
    return medicinesMap;
  }

  // 初期化
  for (const prescriptionId of prescriptionIds) {
    medicinesMap.set(String(prescriptionId), []);
  }

  // 各処方箋の薬を取得
  for (const prescriptionId of prescriptionIds) {
    const medicines = await ctx.db
      .query("medicines")
      .withIndex("by_prescriptionId", (q) =>
        q.eq("prescriptionId", prescriptionId),
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    medicinesMap.set(String(prescriptionId), medicines);
  }

  return medicinesMap;
}

/**
 * グループIDから全薬を一括取得して処方箋IDでグループ化
 * @returns Map<prescriptionId, medicines[]>
 */
export async function batchGetMedicinesByGroupId(
  ctx: DbCtx,
  groupId: Id<"groups">,
): Promise<{
  allMedicines: Doc<"medicines">[];
  medicinesByPrescriptionId: Map<string, Doc<"medicines">[]>;
}> {
  const medicines = await ctx.db
    .query("medicines")
    .withIndex("by_groupId", (q) => q.eq("groupId", groupId))
    .filter((q) => q.eq(q.field("deletedAt"), undefined))
    .collect();

  const medicinesByPrescriptionId = new Map<string, Doc<"medicines">[]>();

  for (const medicine of medicines) {
    if (medicine.prescriptionId) {
      const prescriptionIdStr = String(medicine.prescriptionId);
      const existing = medicinesByPrescriptionId.get(prescriptionIdStr) ?? [];
      existing.push(medicine);
      medicinesByPrescriptionId.set(prescriptionIdStr, existing);
    }
  }

  return { allMedicines: medicines, medicinesByPrescriptionId };
}

/**
 * 複数のIDからドキュメントを一括取得
 * @returns Map<id, document>
 */
export async function batchGetDocuments<
  T extends "prescriptions" | "medicines",
>(ctx: DbCtx, ids: Id<T>[]): Promise<Map<string, Doc<T>>> {
  const docMap = new Map<string, Doc<T>>();

  for (const id of ids) {
    const doc = await ctx.db.get(id);
    if (doc) {
      docMap.set(String(id), doc as Doc<T>);
    }
  }

  return docMap;
}
