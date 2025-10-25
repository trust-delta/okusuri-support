import type { QueryCtx } from "../../_generated/server";

/**
 * 指定した日付に有効な処方箋とその薬を取得
 */
export async function getActiveMedicationsForDate(
  ctx: QueryCtx,
  groupId: string,
  date: string, // YYYY-MM-DD
) {
  // 指定日に有効な処方箋を取得
  const allPrescriptions = await ctx.db
    .query("prescriptions")
    .withIndex("by_groupId_isActive", (q: any) =>
      q.eq("groupId", groupId).eq("isActive", true)
    )
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
    prescriptionId: string;
    prescriptionName: string;
    medicineId: string;
    medicineName: string;
    scheduleId: string;
    timings: string[];
    dosage?: string;
  }> = [];

  for (const prescription of activePrescriptions) {
    const medicines = await ctx.db
      .query("medicines")
      .withIndex("by_prescriptionId", (q: any) =>
        q.eq("prescriptionId", prescription._id),
      )
      .collect();

    for (const medicine of medicines) {
      const schedule = await ctx.db
        .query("medicationSchedules")
        .withIndex("by_medicineId", (q: any) => q.eq("medicineId", medicine._id))
        .first();

      if (schedule && schedule.timings) {
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
