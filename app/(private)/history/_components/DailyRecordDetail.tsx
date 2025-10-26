"use client";

import { useQuery } from "convex/react";
import { Edit } from "lucide-react";
import { api } from "@/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MedicationRecordActions } from "@/features/medication";
import { formatJST, nowJST } from "@/lib/date-fns";
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

// 日付が今日または過去かを判定するヘルパー
const isPastOrToday = (date: Date): boolean => {
  const today = formatJST(nowJST(), "yyyy-MM-dd");
  const targetDate = formatJST(date, "yyyy-MM-dd");
  return targetDate <= today;
};

export function DailyRecordDetail({
  groupId,
  selectedDate,
}: DailyRecordDetailProps) {
  const scheduledDate = selectedDate
    ? formatJST(selectedDate, "yyyy-MM-dd")
    : undefined;

  // 選択された日付が編集可能か判定
  const isEditable = selectedDate ? isPastOrToday(selectedDate) : false;

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
              <p className="text-sm mt-2">簡易記録のみがある可能性があります</p>
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
        <div className="flex items-center justify-between">
          <CardTitle>{formatJST(selectedDate, "M月d日(E)")}の記録</CardTitle>
          {isEditable && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Edit className="h-3 w-3" />
              編集可能
            </Badge>
          )}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {isEditable
            ? "記録の編集・追加ができます"
            : "この日の記録は閲覧のみです"}
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
                    r.medicineId === item.medicineId &&
                    r.timing === item.timing,
                );

                const hasRecord = !!record;

                return (
                  <div
                    key={`${item.medicineId}-${item.timing}-${index}`}
                    className={`flex flex-col gap-2 p-4 rounded-lg transition-all ${
                      hasRecord
                        ? "border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20"
                        : "border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {item.medicineName}
                          </span>
                          {!hasRecord && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                              （未記録）
                            </span>
                          )}
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
                            服用時刻:{" "}
                            {formatJST(new Date(record.takenAt), "HH:mm")}
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
