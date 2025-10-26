import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";

/**
 * 指定した日付に有効な処方箋とその薬を取得
 */
export async function getActiveMedicationsForDate(
  ctx: QueryCtx,
  groupId: Id<"groups">,
  date: string, // YYYY-MM-DD
) {
  // 指定日に有効な処方箋を取得
  const allPrescriptions = await ctx.db
    .query("prescriptions")
    .withIndex("by_groupId_isActive", (q) =>
      q.eq("groupId", groupId).eq("isActive", true),
    )
    .filter((q) => q.eq(q.field("deletedAt"), undefined))
    .collect();

  const activePrescriptions = allPrescriptions.filter((prescription) => {
    const startDate = prescription.startDate;
    const endDate = prescription.endDate;

    const isAfterStart = date >= startDate;
    const isBeforeEnd = !endDate || date <= endDate;

    return isAfterStart && isBeforeEnd;
  });

  // 各処方箋の薬を取得（アクティブなもののみ）
  const medications: Array<{
    prescriptionId: Id<"prescriptions">;
    prescriptionName: string;
    medicineId: Id<"medicines">;
    medicineName: string;
    scheduleId: Id<"medicationSchedules">;
    timings: string[];
    dosage?: { amount: number; unit: string };
  }> = [];

  for (const prescription of activePrescriptions) {
    const medicines = await ctx.db
      .query("medicines")
      .withIndex("by_prescriptionId", (q) =>
        q.eq("prescriptionId", prescription._id),
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    for (const medicine of medicines) {
      const schedule = await ctx.db
        .query("medicationSchedules")
        .withIndex("by_medicineId", (q) => q.eq("medicineId", medicine._id))
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .first();

      if (schedule?.timings) {
        medications.push({
          prescriptionId: prescription._id,
          prescriptionName: prescription.name,
          medicineId: medicine._id,
          medicineName: medicine.name,
          scheduleId: schedule._id,
          timings: schedule.timings,
          dosage: schedule.dosage,
        });
      }
    }
  }

  return medications;
}

/**
 * デフォルト処方箋「日常の薬」を作成
 * グループ作成時に自動的に呼び出される
 */
export async function createDefaultPrescription(
  ctx: MutationCtx,
  groupId: Id<"groups">,
  userId: string,
): Promise<Id<"prescriptions">> {
  const now = Date.now();
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  // デフォルト処方箋を作成
  const prescriptionId = await ctx.db.insert("prescriptions", {
    groupId,
    name: "日常の薬",
    startDate: today,
    endDate: undefined, // 継続中
    isActive: true,
    notes:
      "グループ作成時に自動的に作成されたデフォルト処方箋です。必要に応じて編集または削除してください。",
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  });

  // デフォルトの薬を定義
  const defaultMedicines = [
    { name: "朝の薬", timings: ["morning" as const] },
    { name: "昼の薬", timings: ["noon" as const] },
    { name: "晩の薬", timings: ["evening" as const] },
    { name: "就寝前の薬", timings: ["bedtime" as const] },
  ];

  // 各薬を作成
  for (const medicineData of defaultMedicines) {
    const medicineId = await ctx.db.insert("medicines", {
      groupId,
      prescriptionId,
      name: medicineData.name,
      description: undefined,
      createdBy: userId,
      createdAt: now,
    });

    // スケジュールを作成
    await ctx.db.insert("medicationSchedules", {
      medicineId,
      groupId,
      timings: medicineData.timings,
      dosage: undefined,
      notes: undefined,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });
  }

  return prescriptionId;
}
