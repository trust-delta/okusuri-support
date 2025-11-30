"use client";

import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Clipboard, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Doc } from "@/schema";

interface MemoExportButtonProps {
  records: Doc<"medicationRecords">[] | undefined;
  dateRange: {
    from?: Date;
    to?: Date;
  };
}

const TIMING_LABELS: Record<string, string> = {
  morning: "朝",
  noon: "昼",
  evening: "夕",
  bedtime: "就寝前",
  asNeeded: "頓服",
};

/**
 * メモ付きの記録をテキスト形式でエクスポートするボタン
 */
export function MemoExportButton({
  records,
  dateRange,
}: MemoExportButtonProps) {
  // メモ付きの記録のみをフィルター
  const recordsWithMemo = records?.filter((record) => record.notes) ?? [];

  const handleExport = async () => {
    if (recordsWithMemo.length === 0) {
      toast.error("エクスポートするメモがありません");
      return;
    }

    // 日付でソート（新しい順）
    const sortedRecords = [...recordsWithMemo].sort((a, b) => {
      if (a.scheduledDate !== b.scheduledDate) {
        return b.scheduledDate.localeCompare(a.scheduledDate);
      }
      // 同じ日付の場合はタイミングでソート
      const timingOrder = ["morning", "noon", "evening", "bedtime", "asNeeded"];
      return timingOrder.indexOf(a.timing) - timingOrder.indexOf(b.timing);
    });

    // テキスト生成
    const lines: string[] = [];
    lines.push("=== 服薬メモ一覧 ===");

    // 期間の表示
    if (dateRange.from && dateRange.to) {
      lines.push(
        `期間: ${format(dateRange.from, "yyyy/MM/dd", { locale: ja })} - ${format(dateRange.to, "yyyy/MM/dd", { locale: ja })}`,
      );
    } else if (dateRange.from) {
      lines.push(
        `期間: ${format(dateRange.from, "yyyy/MM/dd", { locale: ja })} 以降`,
      );
    }

    lines.push(`件数: ${sortedRecords.length}件`);
    lines.push("");

    // 各記録をフォーマット
    for (const record of sortedRecords) {
      const date = record.scheduledDate.replace(/-/g, "/");
      const timing = TIMING_LABELS[record.timing] || record.timing;
      const medicineName = record.simpleMedicineName || "薬剤名なし";

      lines.push(`[${date} ${timing}] ${medicineName}`);
      lines.push(record.notes || "");
      lines.push("");
    }

    const text = lines.join("\n");

    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${sortedRecords.length}件のメモをコピーしました`);
    } catch {
      // クリップボードAPIが使えない場合はフォールバック
      toast.error("コピーに失敗しました");
    }
  };

  // メモ付きの記録がない場合は非表示
  if (recordsWithMemo.length === 0) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleExport}
      className="flex items-center gap-2"
    >
      <Clipboard className="h-4 w-4" />
      メモをコピー ({recordsWithMemo.length}件)
    </Button>
  );
}
