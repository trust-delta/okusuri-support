"use client";

import { useMutation } from "convex/react";
import { CheckCheck, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import type { Id } from "@/schema";

interface TimingGroupActionsProps {
  groupId: Id<"groups">;
  timing: "morning" | "noon" | "evening" | "bedtime" | "asNeeded";
  scheduledDate: string;
  items: Array<{
    medicineId: string;
    scheduleId?: string;
    medicineName: string;
    hasRecord: boolean;
  }>;
}

export function TimingGroupActions({
  groupId,
  timing,
  scheduledDate,
  items,
}: TimingGroupActionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const recordMutation = useMutation(api.medications.recordSimpleMedication);

  const handleBulkAction = async (status: "taken" | "skipped") => {
    // 未記録の薬のみを対象にする
    const pendingItems = items.filter((item) => !item.hasRecord);

    if (pendingItems.length === 0) {
      toast.info("全ての薬が既に記録済みです");
      return;
    }

    setIsLoading(true);

    try {
      // 全ての薬に対して並列で記録を作成
      const results = await Promise.all(
        pendingItems.map((item) =>
          recordMutation({
            groupId,
            timing,
            scheduledDate,
            medicineId: item.medicineId as Id<"medicines">,
            scheduleId: item.scheduleId as
              | Id<"medicationSchedules">
              | undefined,
            status,
          }),
        ),
      );

      // エラーチェック
      const errors = results.filter(
        (result: (typeof results)[number]) => !result.isSuccess,
      );

      if (errors.length > 0) {
        toast.error(`${errors.length}件の記録に失敗しました`);
      } else {
        const actionLabel = status === "taken" ? "服用" : "スキップ";
        toast.success(
          `${pendingItems.length}件の薬を${actionLabel}として記録しました`,
        );
      }
    } catch (_error) {
      toast.error("一括記録中にエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  // 全て記録済みの場合はボタンを非表示
  const hasPendingItems = items.some((item) => !item.hasRecord);
  if (!hasPendingItems) {
    return null;
  }

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleBulkAction("taken")}
        disabled={isLoading}
        className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-950"
      >
        <CheckCheck className="h-4 w-4 mr-1" />
        まとめて服用
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleBulkAction("skipped")}
        disabled={isLoading}
        className="text-gray-600 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-800"
      >
        <X className="h-4 w-4 mr-1" />
        まとめてスキップ
      </Button>
    </div>
  );
}
