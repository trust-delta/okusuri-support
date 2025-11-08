"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import type { Id } from "@/schema";
import {
  CalendarView,
  type FilterState,
  RecordDetailView,
  RecordFilters,
} from "./_components";

export default function HistoryPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selectedRange, setSelectedRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({ from: today, to: today }); // デフォルトで当日を選択
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: "",
    status: "all",
    timing: "all",
  });
  const searchParams = useSearchParams();

  // グループステータスを取得
  const groupStatus = useQuery(api.groups.getUserGroupStatus, {});

  // URLパラメータからgroupIdを取得、なければDBのactiveGroupIdまたは最初のグループ
  const urlGroupId = searchParams.get("groupId") as Id<"groups"> | null;
  const activeGroupId =
    urlGroupId || groupStatus?.activeGroupId || groupStatus?.groups[0]?.groupId;

  // カレンダー表示用の日別統計を取得
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

  // フィルター用の月別記録を取得
  const monthlyRecords = useQuery(
    api.medications.getMonthlyRecords,
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
    setSelectedRange({ from: undefined, to: undefined }); // 月が変わったら選択をクリア
  };

  const handleDateRangeSelect = (range: {
    from: Date | undefined;
    to: Date | undefined;
  }) => {
    setSelectedRange(range);
  };

  // フィルター適用済みの記録を取得
  const hasActiveFilter =
    filters.searchQuery !== "" || filters.status !== "all" || filters.timing !== "all";

  const filteredRecords = monthlyRecords?.filter((record) => {
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          記録履歴
        </h1>

        {/* 1カラムレイアウト */}
        <div className="space-y-6">
          {/* カレンダー */}
          <CalendarView
            year={year}
            month={month}
            dailyStats={stats?.dailyStats || {}}
            onDateRangeSelect={handleDateRangeSelect}
            onMonthChange={handleMonthChange}
          />

          {/* 検索・フィルター */}
          <RecordFilters filters={filters} onFiltersChange={setFilters} />

          {/* 記録詳細 */}
          <RecordDetailView
            groupId={activeGroupId}
            dateRange={
              hasActiveFilter ? { from: undefined, to: undefined } : selectedRange
            }
            filterMode={hasActiveFilter}
            filteredRecords={filteredRecords}
          />
        </div>
      </div>
    </div>
  );
}
