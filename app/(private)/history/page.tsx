"use client";

import { useQuery } from "convex/react";
import { subDays } from "date-fns";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import type { Id } from "@/schema";
import {
  type FilterState,
  MemoExportButton,
  MonthlyStatsCard,
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
    memoOnly: false, // メモ付きのみフィルター
  });
  const searchParams = useSearchParams();

  // グループステータスを取得
  const groupStatus = useQuery(api.groups.getUserGroupStatus, {});

  // URLパラメータからgroupIdを取得、なければDBのactiveGroupIdまたは最初のグループ
  const urlGroupId = searchParams.get("groupId") as Id<"groups"> | null;
  const activeGroupId =
    urlGroupId || groupStatus?.activeGroupId || groupStatus?.groups[0]?.groupId;

  // フィルター適用済みの記録を取得
  const hasActiveFilter =
    filters.searchQuery !== "" ||
    filters.status !== "all" ||
    filters.timing !== "all" ||
    filters.memoOnly;

  // バックエンドでフィルタリングを実行（フィルター条件を渡す）
  const backendFilters = useMemo(
    () => ({
      searchQuery: filters.searchQuery || undefined,
      status: filters.status,
      timing: filters.timing,
      memoOnly: filters.memoOnly || undefined,
    }),
    [filters.searchQuery, filters.status, filters.timing, filters.memoOnly],
  );

  // 当月の記録を取得（バックエンドでフィルタリング済み）
  const filteredRecordsResult = useQuery(
    api.medications.getFilteredRecords,
    activeGroupId
      ? {
          groupId: activeGroupId,
          year: today.getFullYear(),
          month: today.getMonth() + 1,
          filters: backendFilters,
        }
      : "skip",
  );

  const filteredRecords = filteredRecordsResult?.isSuccess
    ? filteredRecordsResult.data
    : [];

  // ローディング中
  if (groupStatus === undefined) {
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  // グループに参加していない
  if (!groupStatus?.hasGroup || !activeGroupId) {
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-foreground mb-4">グループに参加していません</p>
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
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ヘッダー */}
        <h1 className="text-3xl font-bold text-foreground">記録履歴</h1>

        {/* 月別統計カード */}
        <MonthlyStatsCard
          groupId={activeGroupId}
          year={today.getFullYear()}
          month={today.getMonth() + 1}
        />

        {/* 1カラムレイアウト */}
        <div className="space-y-6">
          {/* 検索・フィルター */}
          <RecordFilters filters={filters} onFiltersChange={setFilters} />

          {/* メモエクスポートボタン */}
          <div className="flex justify-end">
            <MemoExportButton
              records={filteredRecords}
              dateRange={filters.dateRange}
            />
          </div>

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
