"use client";

import { Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>検索・フィルター</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 薬名検索 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="薬名で検索..."
            value={filters.searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* ステータスとタイミングのフィルター */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* ステータスフィルター */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
      </CardContent>
    </Card>
  );
}
