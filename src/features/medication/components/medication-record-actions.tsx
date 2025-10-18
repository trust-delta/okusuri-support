"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { MedicationTiming } from "../constants/timings";

interface MedicationRecordActionsProps {
  groupId: Id<"groups">;
  timing: MedicationTiming;
  scheduledDate: string;
  simpleMedicineName?: string;
  recordId?: Id<"medicationRecords">;
  recordStatus?: "taken" | "skipped" | "pending";
}

export function MedicationRecordActions({
  groupId,
  timing,
  scheduledDate,
  simpleMedicineName,
  recordId,
  recordStatus,
}: MedicationRecordActionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const recordMutation = useMutation(api.medications.recordSimpleMedication);
  const deleteMutation = useMutation(api.medications.deleteMedicationRecord);

  const handleRecord = async (status: "taken" | "skipped") => {
    setIsLoading(true);
    try {
      await recordMutation({
        groupId,
        timing,
        scheduledDate,
        simpleMedicineName,
        status,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "記録に失敗しました",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!recordId) return;
    setIsLoading(true);
    try {
      await deleteMutation({ recordId });
      toast.success("記録を取り消しました");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "取消しに失敗しました",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (recordStatus && recordId) {
    return (
      <>
        <span
          className={`px-3 py-1 rounded-full text-sm ${recordStatus === "taken"
              ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
              : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
            }`}
        >
          {recordStatus === "taken" ? "服用済み" : "スキップ"}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          disabled={isLoading}
          className="ml-auto text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          取消し
        </Button>
      </>
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
