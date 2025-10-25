"use client";

import { useQuery } from "convex/react";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { api } from "@/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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

const STATUS_CONFIG = {
  taken: {
    label: "服用済み",
    icon: CheckCircle2,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-900/20",
  },
  skipped: {
    label: "スキップ",
    icon: XCircle,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-900/20",
  },
  pending: {
    label: "未服用",
    icon: Clock,
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-50 dark:bg-gray-800",
  },
} as const;

export function DailyRecordDetail({
  groupId,
  selectedDate,
}: DailyRecordDetailProps) {
  const scheduledDate = selectedDate
    ? formatJST(selectedDate, "yyyy-MM-dd")
    : undefined;

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

  if (records === undefined) {
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

  if (records.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{formatJST(selectedDate, "M月d日(E)")}の記録</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
            この日の記録はありません
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{formatJST(selectedDate, "M月d日(E)")}の記録</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {records.map((record) => {
          const statusConfig = STATUS_CONFIG[record.status];
          const StatusIcon = statusConfig.icon;

          return (
            <div
              key={record._id}
              className={`p-4 rounded-lg border ${statusConfig.bgColor} border-gray-200 dark:border-gray-700`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {
                        TIMING_LABELS[
                          record.timing as keyof typeof TIMING_LABELS
                        ]
                      }
                    </span>
                    <div
                      className={`flex items-center gap-1 ${statusConfig.color}`}
                    >
                      <StatusIcon className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>

                  {record.simpleMedicineName && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {record.simpleMedicineName}
                    </p>
                  )}

                  {record.takenAt && (
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      服用時刻: {formatJST(new Date(record.takenAt), "HH:mm")}
                    </p>
                  )}

                  {record.notes && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 p-2 bg-white dark:bg-gray-800 rounded">
                      {record.notes}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
