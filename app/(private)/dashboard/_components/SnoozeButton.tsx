"use client";

import { useMutation } from "convex/react";
import { AlarmClock, X } from "lucide-react";
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

interface SnoozeButtonProps {
  recordId: Id<"medicationRecords">;
  /** 現在のスヌーズ回数 */
  snoozeCount?: number;
  /** 最大スヌーズ回数 */
  maxSnoozeCount?: number;
  /** スヌーズ中かどうか */
  isSnoozed?: boolean;
  /** スヌーズ解除時刻 */
  snoozedUntil?: number;
  /** コンパクト表示 */
  compact?: boolean;
}

const SNOOZE_OPTIONS = [
  { minutes: 5, label: "5分後" },
  { minutes: 10, label: "10分後" },
  { minutes: 15, label: "15分後" },
  { minutes: 30, label: "30分後" },
] as const;

export function SnoozeButton({
  recordId,
  snoozeCount = 0,
  maxSnoozeCount = 3,
  isSnoozed = false,
  snoozedUntil,
  compact = false,
}: SnoozeButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const snoozeMutation = useMutation(
    api.medications.records.snooze.snoozeRecord,
  );
  const cancelSnoozeMutation = useMutation(
    api.medications.records.snooze.cancelSnooze,
  );

  const canSnooze = snoozeCount < maxSnoozeCount;
  const remainingSnoozes = maxSnoozeCount - snoozeCount;

  const handleSnooze = async (minutes: 5 | 10 | 15 | 30) => {
    setIsLoading(true);

    const result = await snoozeMutation({ recordId, minutes });

    if (result.isSuccess) {
      toast.success(`${minutes}分後に再通知します`);
    } else {
      toast.error(result.errorMessage);
    }

    setIsLoading(false);
  };

  const handleCancelSnooze = async () => {
    setIsLoading(true);

    const result = await cancelSnoozeMutation({ recordId });

    if (result.isSuccess) {
      toast.success("スヌーズを解除しました");
    } else {
      toast.error(result.errorMessage);
    }

    setIsLoading(false);
  };

  // スヌーズ中の場合
  if (isSnoozed && snoozedUntil) {
    const now = Date.now();
    const remainingMinutes = Math.max(
      0,
      Math.ceil((snoozedUntil - now) / 60000),
    );

    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <AlarmClock className="h-3 w-3" />
          {remainingMinutes > 0
            ? `${remainingMinutes}分後に通知`
            : "まもなく通知"}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancelSnooze}
          disabled={isLoading}
          className="h-6 px-2"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  // スヌーズ不可（最大回数に達した）
  if (!canSnooze) {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled
        className="text-muted-foreground"
      >
        <AlarmClock className="h-4 w-4 mr-1" />
        {compact ? "" : "スヌーズ不可"}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isLoading}
          className="flex items-center gap-1"
        >
          <AlarmClock className="h-4 w-4" />
          {compact ? "" : "後で"}
          {!compact && remainingSnoozes < maxSnoozeCount && (
            <span className="text-xs text-muted-foreground ml-1">
              ({remainingSnoozes})
            </span>
          )}
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
        <div className="px-2 py-1 text-xs text-muted-foreground border-t mt-1 pt-1">
          残り{remainingSnoozes}回
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
