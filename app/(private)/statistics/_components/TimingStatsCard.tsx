"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TimingBarChart } from "./charts/TimingBarChart";

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

export function TimingStatsCard({
  timingStats,
  asNeeded,
}: TimingStatsCardProps) {
  if (timingStats === undefined || asNeeded === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">タイミング別統計</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[180px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">タイミング別統計</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* タイミング別バーチャート */}
        <TimingBarChart timingStats={timingStats} />

        {/* 頓服統計（参考情報） */}
        {asNeeded.total > 0 && (
          <div className="space-y-2 pt-3 border-t border-border">
            <h4 className="text-sm font-medium text-foreground/80">
              頓服（参考）
            </h4>
            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div className="p-2 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">服用</p>
                <p className="font-semibold text-blue-600 dark:text-blue-400">
                  {asNeeded.taken}回
                </p>
              </div>
              <div className="p-2 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">未使用</p>
                <p className="font-semibold text-muted-foreground">
                  {asNeeded.skipped}回
                </p>
              </div>
              <div className="p-2 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">保留</p>
                <p className="font-semibold text-muted-foreground">
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
