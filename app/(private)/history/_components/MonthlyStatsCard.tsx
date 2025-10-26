"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface MonthlyStatsCardProps {
  stats:
    | {
        totalScheduled: number;
        totalTaken: number;
        totalSkipped: number;
        totalPending: number;
        adherenceRate: number;
        timingStats: {
          morning: {
            taken: number;
            skipped: number;
            pending: number;
            rate: number;
          };
          noon: {
            taken: number;
            skipped: number;
            pending: number;
            rate: number;
          };
          evening: {
            taken: number;
            skipped: number;
            pending: number;
            rate: number;
          };
          bedtime: {
            taken: number;
            skipped: number;
            pending: number;
            rate: number;
          };
        };
        asNeeded: {
          taken: number;
          skipped: number;
          pending: number;
          total: number;
        };
      }
    | undefined;
}

const TIMING_LABELS = {
  morning: "朝",
  noon: "昼",
  evening: "晩",
  bedtime: "就寝前",
  asNeeded: "頓服",
} as const;

export function MonthlyStatsCard({ stats }: MonthlyStatsCardProps) {
  if (stats === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>今月の統計</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>今月の統計</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 全体統計 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              服薬継続率
            </span>
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {stats.adherenceRate.toFixed(1)}%
            </span>
          </div>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">総予定</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {stats.totalScheduled}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">服用</p>
              <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                {stats.totalTaken}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                スキップ
              </p>
              <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                {stats.totalSkipped}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">未記録</p>
              <p className="text-lg font-semibold text-gray-600 dark:text-gray-400">
                {stats.totalPending}
              </p>
            </div>
          </div>
        </div>

        {/* タイミング別統計（定期服用） */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            タイミング別服用率
          </h4>
          <div className="space-y-2">
            {Object.entries(stats.timingStats).map(([timing, data]) => {
              const total = data.taken + data.skipped + data.pending;
              if (total === 0) return null;

              return (
                <div key={timing} className="flex items-center gap-2">
                  <span className="text-sm w-16 text-gray-600 dark:text-gray-400">
                    {TIMING_LABELS[timing as keyof typeof TIMING_LABELS]}
                  </span>
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-green-500 dark:bg-green-600 h-full transition-all"
                      style={{ width: `${data.rate}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-12 text-right text-gray-900 dark:text-gray-100">
                    {data.rate.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 頓服統計（参考情報） */}
        {stats.asNeeded.total > 0 && (
          <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              頓服（参考）
            </h4>
            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">服用</p>
                <p className="font-semibold text-blue-600 dark:text-blue-400">
                  {stats.asNeeded.taken}回
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  未使用
                </p>
                <p className="font-semibold text-gray-600 dark:text-gray-400">
                  {stats.asNeeded.skipped}回
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">保留</p>
                <p className="font-semibold text-gray-600 dark:text-gray-400">
                  {stats.asNeeded.pending}回
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
