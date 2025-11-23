import { v } from "convex/values";
import { query } from "../../_generated/server";

/**
 * 薬名統合グループの一覧を取得
 */
export const getMedicineGroups = query({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    const medicineGroups = await ctx.db
      .query("medicineGroups")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .collect();

    return medicineGroups;
  },
});

/**
 * 類似した薬名を検出して提案
 *
 * レーベンシュタイン距離を使用して、類似度の高い薬名グループを提案
 */
export const findSimilarMedicineNames = query({
  args: {
    groupId: v.id("groups"),
    threshold: v.optional(v.number()), // 類似度閾値（0-1、デフォルト0.7）
  },
  handler: async (ctx, args) => {
    const threshold = args.threshold ?? 0.7;

    // グループ内の全ての薬名を取得
    const medicines = await ctx.db
      .query("medicines")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    // ユニークな薬名のリストを作成
    const uniqueMedicineNames = Array.from(
      new Set(medicines.map((m) => m.name)),
    ).sort();

    // 既存のグループに含まれている薬名を取得
    const existingGroups = await ctx.db
      .query("medicineGroups")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .collect();

    const groupedMedicineNames = new Set(
      existingGroups.flatMap((g) => g.medicineNames),
    );

    // 類似薬名のペアを検出
    const similarPairs: Array<{
      name1: string;
      name2: string;
      similarity: number;
    }> = [];

    for (let i = 0; i < uniqueMedicineNames.length; i++) {
      for (let j = i + 1; j < uniqueMedicineNames.length; j++) {
        const name1 = uniqueMedicineNames[i];
        const name2 = uniqueMedicineNames[j];

        // 既にグループ化されている薬名はスキップ
        if (
          groupedMedicineNames.has(name1) &&
          groupedMedicineNames.has(name2)
        ) {
          continue;
        }

        const similarity = calculateSimilarity(name1, name2);

        if (similarity >= threshold) {
          similarPairs.push({ name1, name2, similarity });
        }
      }
    }

    // 類似度の高い順にソート
    similarPairs.sort((a, b) => b.similarity - a.similarity);

    // 類似薬名のグループを作成
    const suggestions: Array<{
      medicineNames: string[];
      similarity: number;
    }> = [];

    const processed = new Set<string>();

    for (const pair of similarPairs) {
      if (processed.has(pair.name1) || processed.has(pair.name2)) {
        continue;
      }

      // このペアをグループとして追加
      suggestions.push({
        medicineNames: [pair.name1, pair.name2],
        similarity: pair.similarity,
      });

      processed.add(pair.name1);
      processed.add(pair.name2);
    }

    return suggestions;
  },
});

/**
 * 2つの文字列の類似度を計算（レーベンシュタイン距離ベース）
 *
 * @param str1 - 文字列1
 * @param str2 - 文字列2
 * @returns 類似度（0-1）
 */
function calculateSimilarity(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);

  if (maxLength === 0) return 1;

  return 1 - distance / maxLength;
}

/**
 * レーベンシュタイン距離を計算
 *
 * @param str1 - 文字列1
 * @param str2 - 文字列2
 * @returns レーベンシュタイン距離
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  // 動的計画法用の配列
  const matrix: number[][] = Array.from({ length: len1 + 1 }, () =>
    Array.from({ length: len2 + 1 }, () => 0),
  );

  // 初期化
  for (let i = 0; i <= len1; i++) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // 動的計画法で距離を計算
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;

      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // 削除
        matrix[i][j - 1] + 1, // 挿入
        matrix[i - 1][j - 1] + cost, // 置換
      );
    }
  }

  return matrix[len1][len2];
}
