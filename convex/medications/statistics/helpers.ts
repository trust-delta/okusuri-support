import type { Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";

/**
 * 薬別の統計データ
 */
export interface MedicineStats {
  medicineId?: Id<"medicines">;
  medicineName: string;
  totalAmount: number;
  unit: string;
  totalDoses: number; // 合計服用予定回数
  takenCount: number; // 実際に服用した回数
  skippedCount: number; // スキップした回数
  pendingCount: number; // 未記録の回数
  adherenceRate: number; // 服用率（%）
}

/**
 * 薬名統合グループを適用して統計を集約
 *
 * @param ctx - クエリコンテキスト
 * @param groupId - グループID
 * @param stats - 薬名をキーとした統計データのマップ
 * @returns 統合された統計データのマップ
 */
export async function applyMedicineGrouping(
  ctx: QueryCtx,
  groupId: Id<"groups">,
  stats: Record<string, MedicineStats>,
): Promise<Record<string, MedicineStats>> {
  // グルーピング設定を取得
  const groups = await ctx.db
    .query("medicineGroups")
    .withIndex("by_groupId", (q) => q.eq("groupId", groupId))
    .collect();

  // グループがない場合は元のデータをそのまま返す
  if (groups.length === 0) {
    return stats;
  }

  const result = { ...stats };

  for (const group of groups) {
    // グループ内の薬を統合
    const mergedStats: Omit<MedicineStats, "medicineId"> = {
      medicineName: group.canonicalName,
      totalAmount: 0,
      unit: "",
      totalDoses: 0,
      takenCount: 0,
      skippedCount: 0,
      pendingCount: 0,
      adherenceRate: 0,
    };

    let hasData = false;

    for (const medicineName of group.medicineNames) {
      const medicineStats = result[medicineName];
      if (medicineStats) {
        hasData = true;

        // 単位の一貫性チェック
        if (mergedStats.unit && mergedStats.unit !== medicineStats.unit) {
          console.warn(
            `Unit mismatch in group "${group.canonicalName}": ${mergedStats.unit} vs ${medicineStats.unit}`,
          );
        }

        // 統計データを集計
        mergedStats.totalAmount += medicineStats.totalAmount;
        mergedStats.totalDoses += medicineStats.totalDoses;
        mergedStats.takenCount += medicineStats.takenCount;
        mergedStats.skippedCount += medicineStats.skippedCount;
        mergedStats.pendingCount += medicineStats.pendingCount;
        mergedStats.unit = medicineStats.unit || mergedStats.unit;

        // 元のエントリを削除
        delete result[medicineName];
      }
    }

    // データがある場合のみ結果に追加
    if (hasData && mergedStats.totalDoses > 0) {
      // 服用率を再計算
      mergedStats.adherenceRate =
        (mergedStats.takenCount / mergedStats.totalDoses) * 100;

      result[group.canonicalName] = mergedStats as MedicineStats;
    }
  }

  return result;
}

/**
 * 期間内の日付リストを生成
 *
 * @param startDate - YYYY-MM-DD形式の開始日
 * @param endDate - YYYY-MM-DD形式の終了日
 * @returns 日付文字列の配列
 */
export function generateDateRange(
  startDate: string,
  endDate: string,
): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (
    let current = new Date(start);
    current <= end;
    current.setDate(current.getDate() + 1)
  ) {
    dates.push(current.toISOString().split("T")[0]);
  }

  return dates;
}

/**
 * 日付が有効な範囲内かチェック
 *
 * @param date - チェック対象の日付（YYYY-MM-DD）
 * @param startDate - 処方箋の開始日（YYYY-MM-DD）
 * @param endDate - 処方箋の終了日（YYYY-MM-DD、未指定 = 継続中）
 * @returns 有効な場合true
 */
export function isDateInRange(
  date: string,
  startDate: string,
  endDate?: string,
): boolean {
  const isAfterStart = date >= startDate;
  const isBeforeEnd = !endDate || date <= endDate;
  return isAfterStart && isBeforeEnd;
}
