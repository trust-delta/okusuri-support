"use client";

import { useQuery } from "convex/react";
import { api } from "@/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MedicationRecordActions } from "@/features/medication";
import { formatJST } from "@/lib/date-fns";
import type { Id } from "@/schema";

interface DailyRecordDetailProps {
  groupId: Id<"groups">;
  selectedDate: Date | undefined;
}

const TIMING_LABELS = {
  morning: "朝",
  noon: "昼",
  evening: "晩",
  bedtime: "就寝前",
  asNeeded: "頓服",
} as const;

// タイミングの順序
const TIMING_ORDER = {
  morning: 1,
  noon: 2,
  evening: 3,
  bedtime: 4,
  asNeeded: 5,
};

// タイミング値からラベルを取得するヘルパー
const getTimingLabel = (timing: string) => {
  return TIMING_LABELS[timing as keyof typeof TIMING_LABELS] || timing;
};

export function DailyRecordDetail({
  groupId,
  selectedDate,
}: DailyRecordDetailProps) {
  const scheduledDate = selectedDate
    ? formatJST(selectedDate, "yyyy-MM-dd")
    : undefined;

  // その日に有効な薬剤を取得
  const medications = useQuery(
    api.medications.prescriptions.queries.getActiveMedicationsForDateQuery,
    scheduledDate
      ? {
          groupId,
          date: scheduledDate,
        }
      : "skip",
  );

  // その日の記録を取得
  const records = useQuery(
    api.medications.getTodayRecords,
    scheduledDate
      ? {
          groupId,
          scheduledDate,
        }
      : "skip",
  );

  if (!selectedDate) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>日別記録詳細</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
            カレンダーから日付を選択してください
          </p>
        </CardContent>
      </Card>
    );
  }

  // ローディング中
  if (medications === undefined || records === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{formatJST(selectedDate, "M月d日(E)")}の記録</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  // scheduledDateがundefinedの場合の早期リターン（型の安全性を確保）
  if (!scheduledDate) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>日別記録詳細</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
            カレンダーから日付を選択してください
          </p>
        </CardContent>
      </Card>
    );
  }

  // 薬がない場合
  if (medications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{formatJST(selectedDate, "M月d日(E)")}の記録</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>この日に服用する薬がありません</p>
            {records && records.length > 0 && (
              <p className="text-sm mt-2">
                簡易記録のみがある可能性があります
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // 薬ごとにタイミング別に展開
  const medicationItems = medications.flatMap((med) =>
    med.timings.map((timing) => ({
      medicineId: med.medicineId,
      scheduleId: med.scheduleId,
      medicineName: med.medicineName,
      prescriptionId: med.prescriptionId,
      prescriptionName: med.prescriptionName,
      timing: timing as "morning" | "noon" | "evening" | "bedtime" | "asNeeded",
      dosage: med.dosage,
    })),
  );

  // タイミングでグルーピング
  const grouped = Object.entries(
    medicationItems.reduce(
      (acc, item) => {
        if (!acc[item.timing]) acc[item.timing] = [];
        acc[item.timing].push(item);
        return acc;
      },
      {} as Record<string, typeof medicationItems>,
    ),
  ).sort(
    ([a], [b]) =>
      TIMING_ORDER[a as keyof typeof TIMING_ORDER] -
      TIMING_ORDER[b as keyof typeof TIMING_ORDER],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{formatJST(selectedDate, "M月d日(E)")}の記録</CardTitle>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          この日の記録を編集・作成できます
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {grouped.map(([groupName, items]) => (
          <div key={groupName} className="space-y-3">
            {/* グループ見出し */}
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 border-b pb-1">
              {getTimingLabel(groupName)}
            </h3>

            {/* グループ内の薬 */}
            <div className="space-y-2">
              {items.map((item, index) => {
                const record = records?.find(
                  (r) =>
                    r.medicineId === item.medicineId && r.timing === item.timing,
                );

                return (
                  <div
                    key={`${item.medicineId}-${item.timing}-${index}`}
                    className="flex flex-col gap-2 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {item.medicineName}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {item.prescriptionName}
                          {item.dosage && ` · ${item.dosage}`}
                        </div>
                        {record?.notes && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 p-2 bg-gray-50 dark:bg-gray-900 rounded">
                            メモ: {record.notes}
                          </p>
                        )}
                        {record?.takenAt && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            服用時刻: {formatJST(new Date(record.takenAt), "HH:mm")}
                          </p>
                        )}
                      </div>
                      <MedicationRecordActions
                        groupId={groupId}
                        timing={item.timing}
                        scheduledDate={scheduledDate}
                        medicineId={item.medicineId}
                        scheduleId={item.scheduleId}
                        recordId={record?._id}
                        recordStatus={record?.status}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
