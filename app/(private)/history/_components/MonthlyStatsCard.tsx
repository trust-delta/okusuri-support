"use client";

import { useQuery } from "convex/react";
import {
  CheckCircle2,
  Circle,
  Clock,
  Pill,
  SkipForward,
  TrendingUp,
} from "lucide-react";
import { api } from "@/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Id } from "@/schema";

interface MonthlyStatsCardProps {
  groupId: Id<"groups">;
  year: number;
  month: number;
}

const TIMING_LABELS = {
  morning: "朝",
  noon: "昼",
  evening: "晩",
  bedtime: "就寝前",
} as const;

// 表示順序を明示的に定義（朝→昼→晩→就寝前）
const TIMING_ORDER = ["morning", "noon", "evening", "bedtime"] as const;

// 服用率に応じた色を決定（コンポーネント外で定義してパフォーマンス向上）
const getAdherenceColor = (rate: number): string => {
  if (rate >= 80) return "text-green-600 dark:text-green-400";
  if (rate >= 50) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
};

const getProgressColor = (rate: number): string => {
  if (rate >= 80) return "bg-green-500";
  if (rate >= 50) return "bg-yellow-500";
  return "bg-red-500";
};

const getTimingColor = (rate: number, total: number): string => {
  if (total === 0) return "text-muted-foreground";
  if (rate >= 80) return "text-green-600 dark:text-green-400";
  if (rate >= 50) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
};

export function MonthlyStatsCard({
  groupId,
  year,
  month,
}: MonthlyStatsCardProps) {
  const stats = useQuery(api.medications.getMonthlyStats, {
    groupId,
    year,
    month,
  });

  if (stats === undefined) {
    return <MonthlyStatsCardSkeleton />;
  }

  if (stats === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {month}月の統計
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-muted-foreground">
            データの取得に失敗しました
          </p>
        </CardContent>
      </Card>
    );
  }

  const {
    totalScheduled,
    totalTaken,
    totalSkipped,
    totalPending,
    adherenceRate,
    timingStats,
    asNeeded,
  } = stats;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {month}月の統計
        </CardTitle>
        <CardDescription>
          {year}年{month}月の服薬状況
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 服薬継続率 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground/80">
              服薬継続率
            </span>
            <span
              className={`text-2xl font-bold ${getAdherenceColor(adherenceRate)}`}
            >
              {adherenceRate.toFixed(1)}%
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={Math.round(adherenceRate)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="服薬継続率"
            className="relative h-3 w-full overflow-hidden rounded-full bg-muted"
          >
            <div
              className={`h-full transition-all duration-500 ${getProgressColor(adherenceRate)}`}
              style={{ width: `${Math.min(adherenceRate, 100)}%` }}
            />
          </div>
        </div>

        {/* サマリー */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatItem
            icon={<Pill className="h-4 w-4 text-blue-500" />}
            label="予定"
            value={totalScheduled}
            unit="回"
          />
          <StatItem
            icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
            label="服用済"
            value={totalTaken}
            unit="回"
          />
          <StatItem
            icon={<SkipForward className="h-4 w-4 text-yellow-500" />}
            label="スキップ"
            value={totalSkipped}
            unit="回"
          />
          <StatItem
            icon={<Circle className="h-4 w-4 text-muted-foreground" />}
            label="未記録"
            value={totalPending}
            unit="回"
          />
        </div>

        {/* タイミング別統計 */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground/80">
            タイミング別
          </h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {TIMING_ORDER.map((timing) => {
              const stat = timingStats[timing];
              if (!stat) return null;
              return (
                <TimingStat
                  key={timing}
                  label={TIMING_LABELS[timing]}
                  taken={stat.taken}
                  total={stat.taken + stat.skipped + stat.pending}
                  rate={stat.rate}
                />
              );
            })}
          </div>
        </div>

        {/* 頓服（参考） */}
        {asNeeded.total > 0 && (
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" aria-hidden="true" />
              <span>頓服（参考）:</span>
              <span>
                服用 {asNeeded.taken}回 / スキップ {asNeeded.skipped}回
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatItem({
  icon,
  label,
  value,
  unit,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-lg bg-muted p-3">
      <div className="flex items-center gap-1.5">
        <span aria-hidden="true">{icon}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="mt-1 text-lg font-semibold text-foreground">
        {value}
        <span className="ml-0.5 text-xs font-normal text-muted-foreground">
          {unit}
        </span>
      </div>
    </div>
  );
}

function TimingStat({
  label,
  taken,
  total,
  rate,
}: {
  label: string;
  taken: number;
  total: number;
  rate: number;
}) {
  return (
    <div className="rounded-lg border p-2 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-sm font-semibold ${getTimingColor(rate, total)}`}>
        {total > 0 ? `${rate.toFixed(0)}%` : "-"}
      </div>
      <div className="text-xs text-muted-foreground">
        {taken}/{total}
      </div>
    </div>
  );
}

function MonthlyStatsCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
          <Skeleton className="h-3 w-full" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
