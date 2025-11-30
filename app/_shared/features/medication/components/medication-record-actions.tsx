"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import type { Id } from "@/schema";
import type { MedicationTiming } from "../types/timing";
import { MemoEditDialog } from "./memo-edit-dialog";

interface MedicationRecordActionsProps {
  groupId: Id<"groups">;
  timing: MedicationTiming;
  scheduledDate: string;
  medicineId?: Id<"medicines">; // 処方箋ベースの場合に使用
  scheduleId?: Id<"medicationSchedules">; // 処方箋ベースの場合に使用
  simpleMedicineName?: string; // 簡易記録の場合に使用
  recordId?: Id<"medicationRecords">;
  recordStatus?: "taken" | "skipped" | "pending";
  /** 記録済みの場合のメモ内容 */
  recordNotes?: string;
  /** メモダイアログに表示する薬名 */
  medicineName?: string;
}

export function MedicationRecordActions({
  groupId,
  timing,
  scheduledDate,
  medicineId,
  scheduleId,
  simpleMedicineName,
  recordId,
  recordStatus,
  recordNotes,
  medicineName,
}: MedicationRecordActionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const recordMutation = useMutation(api.medications.recordSimpleMedication);
  const deleteMutation = useMutation(api.medications.deleteMedicationRecord);

  const handleRecord = async (status: "taken" | "skipped") => {
    setIsLoading(true);
    const result = await recordMutation({
      groupId,
      timing,
      scheduledDate,
      medicineId,
      scheduleId,
      simpleMedicineName,
      status,
    });

    if (!result.isSuccess) {
      toast.error(result.errorMessage);
    }

    setIsLoading(false);
  };

  const handleDelete = async () => {
    if (!recordId) return;
    setIsLoading(true);

    const result = await deleteMutation({ recordId });

    if (!result.isSuccess) {
      toast.error(result.errorMessage);
    } else {
      toast.success("記録を取り消しました");
    }

    setIsLoading(false);
  };

  if (recordStatus && recordId) {
    return (
      <div className="flex items-center gap-2">
        <span
          className={`px-3 py-1 rounded-full text-sm ${
            recordStatus === "taken"
              ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
              : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
          }`}
        >
          {recordStatus === "taken" ? "服用済み" : "スキップ"}
        </span>
        <MemoEditDialog
          recordId={recordId}
          currentMemo={recordNotes}
          medicineName={medicineName}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          disabled={isLoading}
          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          取消し
        </Button>
      </div>
    );
  }

  return (
    <div className="flex space-x-2">
      <Button
        type="button"
        onClick={() => handleRecord("taken")}
        disabled={isLoading}
      >
        服用
      </Button>
      <Button
        type="button"
        variant="secondary"
        onClick={() => handleRecord("skipped")}
        disabled={isLoading}
      >
        スキップ
      </Button>
    </div>
  );
}
