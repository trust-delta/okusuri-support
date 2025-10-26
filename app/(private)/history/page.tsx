"use client";

import { useQuery } from "convex/react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import type { Id } from "@/schema";
import {
  CalendarView,
  DailyRecordDetail,
  MonthlyStatsCard,
} from "./_components";

export default function HistoryPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const searchParams = useSearchParams();

  // グループステータスを取得
  const groupStatus = useQuery(api.groups.getUserGroupStatus, {});

  // URLパラメータからgroupIdを取得、なければDBのactiveGroupIdまたは最初のグループ
  const urlGroupId = searchParams.get("groupId") as Id<"groups"> | null;
  const activeGroupId =
    urlGroupId || groupStatus?.activeGroupId || groupStatus?.groups[0]?.groupId;

  // 月別統計を取得
  const stats = useQuery(
    api.medications.getMonthlyStats,
    activeGroupId
      ? {
          groupId: activeGroupId,
          year,
          month,
        }
      : "skip",
  );

  const handleMonthChange = (newYear: number, newMonth: number) => {
    setYear(newYear);
    setMonth(newMonth);
    setSelectedDate(undefined); // 月が変わったら選択をクリア
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
  };

  // ローディング中
  if (groupStatus === undefined) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500 dark:text-gray-400">読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  // グループに参加していない
  if (!groupStatus?.hasGroup || !activeGroupId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-gray-900 dark:text-gray-100 mb-4">
                グループに参加していません
              </p>
              <Link href="/onboarding">
                <Button>グループを作成</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center gap-4">
          <Link
            href={`/dashboard${activeGroupId ? `?groupId=${activeGroupId}` : ""}`}
          >
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">ダッシュボードに戻る</span>
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            記録履歴
          </h1>
        </div>

        {/* 2カラムレイアウト: PC表示では横並び、モバイルでは縦並び */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 月別統計 */}
          <div className="lg:col-span-2">
            <MonthlyStatsCard stats={stats} />
          </div>

          {/* カレンダービュー */}
          <div className="lg:col-span-1">
            <CalendarView
              year={year}
              month={month}
              dailyStats={stats?.dailyStats || {}}
              onDateSelect={handleDateSelect}
              onMonthChange={handleMonthChange}
            />
          </div>
        </div>

        {/* 日別詳細（全幅） */}
        <DailyRecordDetail
          groupId={activeGroupId}
          selectedDate={selectedDate}
        />
      </div>
    </div>
  );
}
