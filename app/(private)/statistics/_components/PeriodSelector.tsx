"use client";

import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatJST, nowJST } from "@/lib/date-fns";

interface PeriodSelectorProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

export function PeriodSelector({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: PeriodSelectorProps) {
  const today = nowJST();

  // 今月を設定
  const setThisMonth = () => {
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    onStartDateChange(formatJST(firstDay, "yyyy-MM-dd"));
    onEndDateChange(formatJST(lastDay, "yyyy-MM-dd"));
  };

  // 先月を設定
  const setLastMonth = () => {
    const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
    onStartDateChange(formatJST(firstDay, "yyyy-MM-dd"));
    onEndDateChange(formatJST(lastDay, "yyyy-MM-dd"));
  };

  // 過去7日間を設定
  const setLast7Days = () => {
    const endDay = today;
    const startDay = new Date(today);
    startDay.setDate(startDay.getDate() - 6);
    onStartDateChange(formatJST(startDay, "yyyy-MM-dd"));
    onEndDateChange(formatJST(endDay, "yyyy-MM-dd"));
  };

  // 過去30日間を設定
  const setLast30Days = () => {
    const endDay = today;
    const startDay = new Date(today);
    startDay.setDate(startDay.getDate() - 29);
    onStartDateChange(formatJST(startDay, "yyyy-MM-dd"));
    onEndDateChange(formatJST(endDay, "yyyy-MM-dd"));
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <Label className="text-base font-semibold">期間を選択</Label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">開始日</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                max={endDate}
                onChange={(e) => onStartDateChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">終了日</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                max={formatJST(today, "yyyy-MM-dd")}
                onChange={(e) => onEndDateChange(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={setLast7Days}>
              過去7日間
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={setLast30Days}>
              過去30日間
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={setLastMonth}>
              先月
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={setThisMonth}>
              今月
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
