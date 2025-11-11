"use client";

import { useQuery } from "convex/react";
import { subDays } from "date-fns";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import type { Id } from "@/schema";
import {
  type FilterState,
  RecordDetailView,
  RecordFilters,
} from "./_components";

export default function HistoryPage() {
  const today = new Date();
  const oneWeekAgo = subDays(today, 7);
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: "",
    status: "all",
    timing: "all",
    dateRange: { from: oneWeekAgo, to: today }, // デフォルトで過去1週間を選択
    sortOrder: "desc", // デフォルトで新しい順
  });
  const searchParams = useSearchParams();

  // グループステータスを取得
  const groupStatus = useQuery(api.groups.getUserGroupStatus, {});

  // URLパラメータからgroupIdを取得、なければDBのactiveGroupIdまたは最初のグループ
  const urlGroupId = searchParams.get("groupId") as Id<"groups"> | null;
  const activeGroupId =
    urlGroupId || groupStatus?.activeGroupId || groupStatus?.groups[0]?.groupId;

  // 当月の記録を取得（フィルター用）
  const monthlyRecords = useQuery(
    api.medications.getMonthlyRecords,
    activeGroupId
      ? {
          groupId: activeGroupId,
          year: today.getFullYear(),
          month: today.getMonth() + 1,
        }
      : "skip",
  );

  // フィルター適用済みの記録を取得
  const hasActiveFilter =
    filters.searchQuery !== "" ||
    filters.status !== "all" ||
    filters.timing !== "all";

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
          {/* 検索・フィルター */}
          <RecordFilters filters={filters} onFiltersChange={setFilters} />

          {/* 記録詳細 */}
          <RecordDetailView
            groupId={activeGroupId}
            dateRange={hasActiveFilter ? {} : filters.dateRange}
            filterMode={hasActiveFilter}
            filteredRecords={filteredRecords}
            sortOrder={filters.sortOrder}
          />
        </div>
      </div>
    </div>
  );
}
