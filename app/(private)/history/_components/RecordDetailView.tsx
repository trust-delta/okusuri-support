"use client";

import { useQuery } from "convex/react";
import { Edit } from "lucide-react";
import { api } from "@/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MedicationRecordActions,
  TimingGroupActions,
} from "@/features/medication";
import { formatJST, nowJST } from "@/lib/date-fns";
import type { Doc, Id } from "@/schema";

interface RecordDetailViewProps {
  groupId: Id<"groups">;
  dateRange: { from?: Date; to?: Date };
  filterMode?: boolean;
  filteredRecords?: Doc<"medicationRecords">[];
  sortOrder?: "asc" | "desc";
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

// 日付範囲から日付の配列を生成
const getDateArray = (from: Date, to: Date): Date[] => {
  const dates: Date[] = [];
  const current = new Date(from);
  const end = new Date(to);

  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

export function RecordDetailView({
  groupId,
  dateRange,
  filterMode = false,
  filteredRecords,
  sortOrder = "desc",
}: RecordDetailViewProps) {
  const { from, to } = dateRange;

  // 表示する日付の配列を取得
  let dates = from && to ? getDateArray(from, to) : from ? [from] : [];

  // 並び替えを適用
  dates = dates.sort((a, b) => {
    if (sortOrder === "desc") {
      return b.getTime() - a.getTime(); // 新しい順（降順）
    }
    return a.getTime() - b.getTime(); // 古い順（昇順）
  });

  // 選択なし
  if (dates.length === 0 && !filterMode) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p>検索・フィルターから日付範囲を選択してください</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (filterMode && filteredRecords) {
    return (
      <FilteredRecordsView
        groupId={groupId}
        records={filteredRecords}
        sortOrder={sortOrder}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>記録詳細</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {dates.map((date) => (
          <DayRecordSection
            key={date.toISOString()}
            groupId={groupId}
            date={date}
          />
        ))}
      </CardContent>
    </Card>
  );
}

// 単一日の記録セクション
function DayRecordSection({
  groupId,
  date,
}: {
  groupId: Id<"groups">;
  date: Date;
}) {
  const scheduledDate = formatJST(date, "yyyy-MM-dd");
  const isEditable = isPastOrToday(date);

  // その日に有効な薬剤を取得
  const medications = useQuery(
    api.medications.prescriptions.queries.getActiveMedicationsForDateQuery,
    {
      groupId,
      date: scheduledDate,
    },
  );

  // その日の記録を取得
  const records = useQuery(api.medications.getTodayRecords, {
    groupId,
    scheduledDate,
  });

  // ローディング中
  if (medications === undefined || records === undefined) {
    return (
      <div className="border-t pt-6 first:border-t-0 first:pt-0">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {formatJST(date, "M月d日(E)")}の記録
        </h2>
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  // 薬がない場合
  if (medications.length === 0) {
    return (
      <div className="border-t pt-6 first:border-t-0 first:pt-0">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {formatJST(date, "M月d日(E)")}の記録
        </h2>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>この日に服用する薬がありません</p>
        </div>
      </div>
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
    <div className="border-t pt-6 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {formatJST(date, "M月d日(E)")}の記録
        </h2>
        {isEditable && (
          <Badge variant="outline" className="flex items-center gap-1">
            <Edit className="h-3 w-3" />
            編集可能
          </Badge>
        )}
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {isEditable
          ? "記録の編集・追加ができます"
          : "この日の記録は閲覧のみです"}
      </p>
      <div className="space-y-6">
        {grouped.map(([groupName, items]) => {
          // グループ内の薬の記録状態を取得
          const itemsWithRecordStatus = items.map((item) => {
            const record = records?.find(
              (r) =>
                r.medicineId === item.medicineId && r.timing === item.timing,
            );
            return {
              medicineId: item.medicineId,
              scheduleId: item.scheduleId,
              medicineName: item.medicineName,
              hasRecord: !!record,
            };
          });

          return (
            <div key={groupName} className="space-y-3">
              {/* グループ見出しとまとめて操作ボタン */}
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {getTimingLabel(groupName)}
                </h3>
                {/* 編集可能な場合のみまとめて操作ボタンを表示 */}
                {isEditable && (
                  <TimingGroupActions
                    groupId={groupId}
                    timing={
                      groupName as
                        | "morning"
                        | "noon"
                        | "evening"
                        | "bedtime"
                        | "asNeeded"
                    }
                    scheduledDate={scheduledDate}
                    items={itemsWithRecordStatus}
                  />
                )}
              </div>

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
                            {item.dosage &&
                              ` · ${item.dosage.amount}${item.dosage.unit}`}
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
          );
        })}
      </div>
    </div>
  );
}

// フィルター結果のビュー
function FilteredRecordsView({
  groupId,
  records,
  sortOrder = "desc",
}: {
  groupId: Id<"groups">;
  records: Doc<"medicationRecords">[];
  sortOrder?: "asc" | "desc";
}) {
  if (records.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p>条件に一致する記録がありません</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 日付でグループ化
  const groupedByDate = records.reduce(
    (acc, record) => {
      const date = record.scheduledDate;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(record);
      return acc;
    },
    {} as Record<string, typeof records>,
  );

  // 並び替えを適用
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
    if (sortOrder === "desc") {
      return b.localeCompare(a); // 新しい順（降順）
    }
    return a.localeCompare(b); // 古い順（昇順）
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          検索結果{" "}
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
            ({records.length}件)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {sortedDates.map((dateStr) => {
          const date = new Date(`${dateStr}T00:00:00`);
          return (
            <DayRecordSection key={dateStr} groupId={groupId} date={date} />
          );
        })}
      </CardContent>
    </Card>
  );
}
