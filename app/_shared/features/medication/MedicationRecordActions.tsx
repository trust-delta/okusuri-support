"use client";

import { useMutation } from "convex/react";
import { AlarmClock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Id } from "@/schema";
import { MemoEditDialog } from "./MemoEditDialog";
import type { MedicationTiming } from "./types";

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
  /** スヌーズ回数 */
  snoozeCount?: number;
  /** スヌーズ中かどうか */
  snoozedUntil?: number;
}

const MAX_SNOOZE_COUNT = 3;
const SNOOZE_OPTIONS = [
  { minutes: 5, label: "5分後" },
  { minutes: 10, label: "10分後" },
  { minutes: 15, label: "15分後" },
  { minutes: 30, label: "30分後" },
] as const;

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
  snoozeCount = 0,
  snoozedUntil,
}: MedicationRecordActionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const recordMutation = useMutation(api.medications.recordSimpleMedication);
  const deleteMutation = useMutation(api.medications.deleteMedicationRecord);
  const snoozeMutation = useMutation(
    api.medications.records.snooze.snoozeRecord,
  );

  const canSnooze = snoozeCount < MAX_SNOOZE_COUNT;
  const isSnoozed = snoozedUntil !== undefined && snoozedUntil > Date.now();

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

  const handleSnooze = async (minutes: 5 | 10 | 15 | 30) => {
    if (!recordId) return;
    setIsLoading(true);

    const result = await snoozeMutation({ recordId, minutes });

    if (result.isSuccess) {
      toast.success(`${minutes}分後に再通知します`);
    } else {
      toast.error(result.errorMessage);
    }

    setIsLoading(false);
  };

  // 記録済み（taken/skipped）の場合
  if (recordStatus && recordStatus !== "pending" && recordId) {
    return (
      <div className="flex items-center gap-2">
        <span
          className={`px-3 py-1 rounded-full text-sm ${
            recordStatus === "taken"
              ? "bg-success/10 text-success"
              : "bg-muted text-muted-foreground"
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
          className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
        >
          取消し
        </Button>
      </div>
    );
  }

  // スヌーズ中の表示
  if (isSnoozed && snoozedUntil) {
    const remainingMinutes = Math.max(
      0,
      Math.ceil((snoozedUntil - Date.now()) / 60000),
    );

    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground flex items-center gap-1 px-3 py-1 rounded-full bg-muted">
          <AlarmClock className="h-3 w-3" />
          {remainingMinutes > 0
            ? `${remainingMinutes}分後に通知`
            : "まもなく通知"}
        </span>
        <Button
          type="button"
          onClick={() => handleRecord("taken")}
          disabled={isLoading}
          size="sm"
        >
          服用
        </Button>
      </div>
    );
  }

  // 未記録の場合
  return (
    <div className="flex items-center gap-2">
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
      {recordId && canSnooze && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="flex items-center gap-1"
            >
              <AlarmClock className="h-4 w-4" />
              後で
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {SNOOZE_OPTIONS.map(({ minutes, label }) => (
              <DropdownMenuItem
                key={minutes}
                onClick={() => handleSnooze(minutes)}
                disabled={isLoading}
              >
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
