"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { Doc } from "@/schema";
import type { FilterState } from "./RecordFilters";

interface FilteredRecordsListProps {
  records: Doc<"medicationRecords">[] | undefined;
  filters: FilterState;
}

const TIMING_LABELS = {
  morning: "朝",
  noon: "昼",
  evening: "晩",
  bedtime: "就寝前",
  asNeeded: "頓服",
} as const;

const STATUS_LABELS = {
  taken: "服用済み",
  skipped: "スキップ",
  pending: "未記録",
} as const;

const STATUS_COLORS = {
  taken: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20",
  skipped: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20",
  pending: "text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20",
} as const;

export function FilteredRecordsList({
  records,
  filters,
}: FilteredRecordsListProps) {
  if (records === undefined) {
    return (
      <div className="border-t pt-6 mt-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          フィルター結果
        </h3>
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  // フィルタリング
  const filteredRecords = records.filter((record) => {
    // 薬名検索
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const medicineName = record.simpleMedicineName || "";
      if (!medicineName.toLowerCase().includes(query)) {
        return false;
      }
    }

    // ステータスフィルター
    if (filters.status !== "all" && record.status !== filters.status) {
      return false;
    }

    // タイミングフィルター
    if (filters.timing !== "all" && record.timing !== filters.timing) {
      return false;
    }

    return true;
  });

  // 日付でグループ化（新しい順）
  const groupedByDate = filteredRecords.reduce(
    (acc, record) => {
      const date = record.scheduledDate;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(record);
      return acc;
    },
    {} as Record<string, typeof filteredRecords>,
  );

  const sortedDates = Object.keys(groupedByDate).sort((a, b) =>
    b.localeCompare(a),
  );

  if (filteredRecords.length === 0) {
    return (
      <div className="border-t pt-6 mt-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          フィルター結果
        </h3>
        <p className="text-center text-gray-500 dark:text-gray-400 py-8">
          条件に一致する記録がありません
        </p>
      </div>
    );
  }

  return (
    <div className="border-t pt-6 mt-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        フィルター結果{" "}
        <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
          ({filteredRecords.length}件)
        </span>
      </h3>
      <div className="space-y-6">
        {sortedDates.map((date) => {
          const dateRecords = groupedByDate[date];
          const dateObj = new Date(`${date}T00:00:00`);
          const formattedDate = dateObj.toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "short",
          });

          return (
            <div key={date} className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 border-b pb-1">
                {formattedDate}
              </h3>
              <div className="space-y-2">
                {dateRecords.map((record) => (
                  <div
                    key={record._id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {record.simpleMedicineName || "薬名なし"}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {TIMING_LABELS[record.timing]}
                        </span>
                      </div>
                      {record.notes && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {record.notes}
                        </p>
                      )}
                      {record.takenAt && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {new Date(record.takenAt).toLocaleString("ja-JP")}
                        </p>
                      )}
                    </div>
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[record.status]}`}
                    >
                      {STATUS_LABELS[record.status]}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
