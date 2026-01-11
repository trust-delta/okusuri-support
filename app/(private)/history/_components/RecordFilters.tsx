"use client";

import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { CalendarIcon, MessageSquare, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface FilterState {
  searchQuery: string;
  status: "all" | "taken" | "skipped" | "pending";
  timing: "all" | "morning" | "noon" | "evening" | "bedtime" | "asNeeded";
  dateRange: {
    from?: Date;
    to?: Date;
  };
  sortOrder: "asc" | "desc";
  /** メモ付きの記録のみ表示 */
  memoOnly: boolean;
}

interface RecordFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

const STATUS_OPTIONS = [
  { value: "all", label: "すべて" },
  { value: "taken", label: "服用済み" },
  { value: "skipped", label: "スキップ" },
  { value: "pending", label: "未記録" },
] as const;

const TIMING_OPTIONS = [
  { value: "all", label: "すべて" },
  { value: "morning", label: "朝" },
  { value: "noon", label: "昼" },
  { value: "evening", label: "晩" },
  { value: "bedtime", label: "就寝前" },
  { value: "asNeeded", label: "頓服" },
] as const;

const SORT_OPTIONS = [
  { value: "desc", label: "新しい順" },
  { value: "asc", label: "古い順" },
] as const;

export function RecordFilters({
  filters,
  onFiltersChange,
}: RecordFiltersProps) {
  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, searchQuery: value });
  };

  const handleStatusChange = (value: string) => {
    onFiltersChange({
      ...filters,
      status: value as FilterState["status"],
    });
  };

  const handleTimingChange = (value: string) => {
    onFiltersChange({
      ...filters,
      timing: value as FilterState["timing"],
    });
  };

  const handleDateRangeChange = (
    range: { from?: Date; to?: Date } | undefined,
  ) => {
    onFiltersChange({
      ...filters,
      dateRange: range || {},
    });
  };

  const handleClearDateRange = () => {
    onFiltersChange({
      ...filters,
      dateRange: {},
    });
  };

  const handleSortOrderChange = (value: string) => {
    onFiltersChange({
      ...filters,
      sortOrder: value as FilterState["sortOrder"],
    });
  };

  const handleMemoOnlyChange = (checked: boolean) => {
    onFiltersChange({
      ...filters,
      memoOnly: checked,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>検索・フィルター</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 薬名検索 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="search-medicine"
            type="text"
            placeholder="薬名で検索..."
            value={filters.searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* 日付範囲選択 */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-foreground/80">日付範囲</div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateRange.from ? (
                  filters.dateRange.to ? (
                    <>
                      {format(filters.dateRange.from, "yyyy/MM/dd", {
                        locale: ja,
                      })}{" "}
                      -{" "}
                      {format(filters.dateRange.to, "yyyy/MM/dd", {
                        locale: ja,
                      })}
                    </>
                  ) : (
                    format(filters.dateRange.from, "yyyy/MM/dd", { locale: ja })
                  )
                ) : (
                  <span className="text-muted-foreground">日付を選択...</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={
                  filters.dateRange.from
                    ? { from: filters.dateRange.from, to: filters.dateRange.to }
                    : undefined
                }
                onSelect={(range) => handleDateRangeChange(range)}
                locale={ja}
                disabled={(date) => date > new Date()}
                initialFocus
              />
              {(filters.dateRange.from || filters.dateRange.to) && (
                <div className="p-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearDateRange}
                    className="w-full"
                  >
                    <X className="mr-2 h-4 w-4" />
                    クリア
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>

        {/* ステータスとタイミングのフィルター */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* ステータスフィルター */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground/80">
              ステータス
            </div>
            <Select value={filters.status} onValueChange={handleStatusChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* タイミングフィルター */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground/80">
              タイミング
            </div>
            <Select value={filters.timing} onValueChange={handleTimingChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMING_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 並び替え */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-foreground/80">並び替え</div>
          <Select
            value={filters.sortOrder}
            onValueChange={handleSortOrderChange}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* メモ付きのみフィルター */}
        <div className="flex items-center space-x-2 pt-2 border-t">
          <Checkbox
            id="memoOnly"
            checked={filters.memoOnly}
            onCheckedChange={handleMemoOnlyChange}
          />
          <Label
            htmlFor="memoOnly"
            className="flex items-center gap-2 text-sm font-medium cursor-pointer"
          >
            <MessageSquare className="h-4 w-4 text-amber-500" />
            メモ付きの記録のみ表示
          </Label>
        </div>
      </CardContent>
    </Card>
  );
}
