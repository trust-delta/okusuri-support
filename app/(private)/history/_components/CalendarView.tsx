"use client";

import { ja } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CalendarViewProps {
  year: number;
  month: number;
  dailyStats: Record<
    string,
    { taken: number; skipped: number; pending: number; rate: number }
  >;
  onDateRangeSelect: (range: {
    from: Date | undefined;
    to: Date | undefined;
  }) => void;
  onMonthChange: (year: number, month: number) => void;
}

export function CalendarView({
  year,
  month,
  dailyStats,
  onDateRangeSelect,
  onMonthChange,
}: CalendarViewProps) {
  const [selectedRange, setSelectedRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({ from: undefined, to: undefined });

  const handleDateSelect = (
    range: { from: Date | undefined; to: Date | undefined } | undefined,
  ) => {
    const newRange = range || { from: undefined, to: undefined };
    setSelectedRange(newRange);
    onDateRangeSelect(newRange);
  };

  const handlePreviousMonth = () => {
    if (month === 1) {
      onMonthChange(year - 1, 12);
    } else {
      onMonthChange(year, month - 1);
    }
  };

  const handleNextMonth = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;

    // 未来の月は選択不可
    if (year === currentYear && month === currentMonth) {
      return;
    }

    if (month === 12) {
      onMonthChange(year + 1, 1);
    } else {
      onMonthChange(year, month + 1);
    }
  };

  // 日付セルをカスタマイズして色分け表示
  const modifiers = {
    completed: [] as Date[],
    partial: [] as Date[],
    failed: [] as Date[],
  };

  for (const [dateStr, stats] of Object.entries(dailyStats)) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);

    if (stats.rate === 100) {
      modifiers.completed.push(date);
    } else if (stats.rate > 0) {
      modifiers.partial.push(date);
    } else if (stats.taken === 0 && stats.skipped > 0) {
      modifiers.failed.push(date);
    }
  }

  const modifiersClassNames = {
    completed:
      "bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100 font-semibold hover:bg-green-200 dark:hover:bg-green-900/50",
    partial:
      "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-100 font-semibold hover:bg-yellow-200 dark:hover:bg-yellow-900/50",
    failed:
      "bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-100 font-semibold hover:bg-red-200 dark:hover:bg-red-900/50",
  };

  const today = new Date();
  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth() + 1;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            {year}年{month}月
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePreviousMonth}
              aria-label="前月"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNextMonth}
              disabled={isCurrentMonth}
              aria-label="次月"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded" />
            <span className="text-gray-600 dark:text-gray-400">100%服用</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded" />
            <span className="text-gray-600 dark:text-gray-400">一部服用</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded" />
            <span className="text-gray-600 dark:text-gray-400">未服用</span>
          </div>
        </div>

        <Calendar
          mode="range"
          selected={selectedRange}
          onSelect={handleDateSelect}
          month={new Date(year, month - 1)}
          locale={ja}
          modifiers={modifiers}
          modifiersClassNames={modifiersClassNames}
          className="rounded-md border"
          classNames={{
            nav: "hidden", // ナビゲーションボタンを非表示（CalendarViewのヘッダーで制御）
            month_caption: "hidden", // 月キャプションを非表示（CalendarViewのヘッダーで表示）
          }}
          disabled={(date) => {
            // 未来の日付は無効化
            return date > today;
          }}
        />
      </CardContent>
    </Card>
  );
}
