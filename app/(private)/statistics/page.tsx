"use client";

import { useQuery } from "convex/react";
import { BarChart3 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/api";
import { Card, CardContent } from "@/components/ui/card";
import { formatJST, nowJST } from "@/lib/date-fns";
import type { Id } from "@/schema";
import { MedicineStatsList } from "./_components/MedicineStatsList";
import { PeriodSelector } from "./_components/PeriodSelector";
import { StatsSummary } from "./_components/StatsSummary";
import { TimingStatsCard } from "./_components/TimingStatsCard";

export default function StatisticsPage() {
  const searchParams = useSearchParams();

  // グループステータスを取得
  const groupStatus = useQuery(api.groups.getUserGroupStatus, {});

  // URLパラメータからgroupIdを取得、なければDBのactiveGroupIdまたは最初のグループ
  const urlGroupId = searchParams.get("groupId") as Id<"groups"> | null;
  const activeGroupId =
    urlGroupId || groupStatus?.activeGroupId || groupStatus?.groups[0]?.groupId;

  // 期間選択（デフォルトは今月1日〜今日）
  const today = nowJST();
  const [startDate, setStartDate] = useState(
    formatJST(new Date(today.getFullYear(), today.getMonth(), 1), "yyyy-MM-dd"),
  );
  const [endDate, setEndDate] = useState(formatJST(today, "yyyy-MM-dd"));

  // 統計データを取得
  const stats = useQuery(
    api.medications.statistics.queries.getMedicationStatsByPeriod,
    activeGroupId
      ? {
          groupId: activeGroupId,
          startDate,
          endDate,
        }
      : "skip",
  );

  if (!activeGroupId) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              グループ情報を読み込んでいます...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            服薬統計
          </h1>
          <p className="text-muted-foreground mt-2">
            期間別の服薬状況と用量の統計を確認できます
          </p>
        </div>
      </div>

      {/* 期間選択 */}
      <PeriodSelector
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
      />

      {/* サマリー */}
      {stats && <StatsSummary summary={stats.summary} period={stats.period} />}

      {/* タイミング別統計 */}
      {stats && (
        <TimingStatsCard
          timingStats={stats.timingStats}
          asNeeded={stats.asNeeded}
        />
      )}

      {/* 薬別統計 */}
      {stats && (
        <MedicineStatsList
          medicines={stats.medicines}
          groupId={activeGroupId}
        />
      )}
    </div>
  );
}
