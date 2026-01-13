"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MedicationGroupedRecordsList } from "@/features/medication";
import { formatJST, nowJST } from "@/lib/date-fns";
import type { Doc, Id } from "@/schema";

interface RecordDetailViewProps {
  groupId: Id<"groups">;
  dateRange: { from?: Date; to?: Date };
  filterMode?: boolean;
  filteredRecords?: Doc<"medicationRecords">[];
  sortOrder?: "asc" | "desc";
}

// 日付が今日または過去かを判定するヘルパー
const isPastOrToday = (date: Date): boolean => {
  const today = formatJST(nowJST(), "yyyy-MM-dd");
  const targetDate = formatJST(date, "yyyy-MM-dd");
  return targetDate <= today;
};

// 日付範囲から日付の配列を生成
const getDateArray = (from: Date, to: Date): Date[] => {
  const dates: Date[] = [];
  const current = new Date(from);
  const end = new Date(to);

  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

export function RecordDetailView({
  groupId,
  dateRange,
  filterMode = false,
  filteredRecords,
  sortOrder = "desc",
}: RecordDetailViewProps) {
  const { from, to } = dateRange;

  // 表示する日付の配列を取得
  let dates = from && to ? getDateArray(from, to) : from ? [from] : [];

  // 並び替えを適用
  dates = dates.sort((a, b) => {
    if (sortOrder === "desc") {
      return b.getTime() - a.getTime(); // 新しい順（降順）
    }
    return a.getTime() - b.getTime(); // 古い順（昇順）
  });

  // 選択なし
  if (dates.length === 0 && !filterMode) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12 text-muted-foreground">
            <p>検索・フィルターから日付範囲を選択してください</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (filterMode && filteredRecords) {
    return (
      <FilteredRecordsView
        groupId={groupId}
        records={filteredRecords}
        sortOrder={sortOrder}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>記録詳細</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {dates.map((date) => (
          <DayRecordSection
            key={date.toISOString()}
            groupId={groupId}
            date={date}
          />
        ))}
      </CardContent>
    </Card>
  );
}

// 単一日の記録セクション
function DayRecordSection({
  groupId,
  date,
}: {
  groupId: Id<"groups">;
  date: Date;
}) {
  const scheduledDate = formatJST(date, "yyyy-MM-dd");
  const isEditable = isPastOrToday(date);

  return (
    <div className="border-t pt-6 first:border-t-0 first:pt-0">
      <MedicationGroupedRecordsList
        groupId={groupId}
        scheduledDate={scheduledDate}
        allowGroupBySwitch={false}
        showBulkActions={isEditable}
        showTimingImages={true}
        isEditable={isEditable}
        showUnrecordedStyle="dashed"
        showRecordDetails={true}
        showEditableBadge={isEditable}
        title={
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {formatJST(date, "M月d日(E)")}の記録
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              {isEditable
                ? "記録の編集・追加ができます"
                : "この日の記録は閲覧のみです"}
            </p>
          </div>
        }
        emptyMessage="この日に服用する薬がありません"
      />
    </div>
  );
}

// フィルター結果のビュー
function FilteredRecordsView({
  groupId,
  records,
  sortOrder = "desc",
}: {
  groupId: Id<"groups">;
  records: Doc<"medicationRecords">[];
  sortOrder?: "asc" | "desc";
}) {
  if (records.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12 text-muted-foreground">
            <p>条件に一致する記録がありません</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 日付でグループ化
  const groupedByDate = records.reduce(
    (acc, record) => {
      const date = record.scheduledDate;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(record);
      return acc;
    },
    {} as Record<string, typeof records>,
  );

  // 並び替えを適用
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
    if (sortOrder === "desc") {
      return b.localeCompare(a); // 新しい順（降順）
    }
    return a.localeCompare(b); // 古い順（昇順）
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          検索結果{" "}
          <span className="text-sm font-normal text-muted-foreground">
            ({records.length}件)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {sortedDates.map((dateStr) => {
          const date = new Date(`${dateStr}T00:00:00`);
          return (
            <DayRecordSection key={dateStr} groupId={groupId} date={date} />
          );
        })}
      </CardContent>
    </Card>
  );
}
