"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface TimingStatsCardProps {
  timingStats: Record<string, TimingStat> | undefined;
  asNeeded:
    | {
        taken: number;
        skipped: number;
        pending: number;
        total: number;
      }
    | undefined;
}

interface TimingStat {
  taken: number;
  skipped: number;
  pending: number;
  total: number;
  rate: number;
}

const TIMING_LABELS = {
  morning: "朝",
  noon: "昼",
  evening: "晩",
  bedtime: "就寝前",
} as const;

export function TimingStatsCard({ timingStats, asNeeded }: TimingStatsCardProps) {
  if (timingStats === undefined || asNeeded === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>タイミング別統計</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>タイミング別統計</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* タイミング別統計（定期服用） */}
        <div className="space-y-3">
          {Object.entries(timingStats).map(([timing, data]) => {
            if (data.total === 0) return null;

            return (
              <div key={timing} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {TIMING_LABELS[timing as keyof typeof TIMING_LABELS]}
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {data.rate.toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-green-500 dark:bg-green-600 h-full transition-all"
                      style={{ width: `${data.rate}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    服用 {data.taken} / スキップ {data.skipped} / 未記録{" "}
                    {data.pending}
                  </span>
                  <span>計 {data.total}回</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 頓服統計（参考情報） */}
        {asNeeded.total > 0 && (
          <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              頓服（参考）
            </h4>
            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">服用</p>
                <p className="font-semibold text-blue-600 dark:text-blue-400">
                  {asNeeded.taken}回
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">未使用</p>
                <p className="font-semibold text-gray-600 dark:text-gray-400">
                  {asNeeded.skipped}回
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">保留</p>
                <p className="font-semibold text-gray-600 dark:text-gray-400">
                  {asNeeded.pending}回
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
