"use client";

import { useMutation } from "convex/react";
import { MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { Id } from "@/schema";

const MAX_MEMO_LENGTH = 500;

interface MemoEditDialogProps {
  recordId: Id<"medicationRecords">;
  currentMemo?: string;
  medicineName?: string;
  /** ダイアログのトリガーボタンを非表示にして、外部から制御する場合 */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** トリガーボタンのバリアント */
  triggerVariant?: "icon" | "button";
}

export function MemoEditDialog({
  recordId,
  currentMemo = "",
  medicineName,
  open: controlledOpen,
  onOpenChange,
  triggerVariant = "icon",
}: MemoEditDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [memo, setMemo] = useState(currentMemo);
  const [isLoading, setIsLoading] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = isControlled
    ? (value: boolean) => onOpenChange?.(value)
    : setInternalOpen;

  const updateMutation = useMutation(api.medications.updateMedicationRecord);

  // ダイアログを開いたときにメモを初期化
  useEffect(() => {
    if (isOpen) {
      setMemo(currentMemo);
    }
  }, [isOpen, currentMemo]);

  const handleSave = async () => {
    setIsLoading(true);

    const result = await updateMutation({
      recordId,
      notes: memo.trim() || undefined,
    });

    if (!result.isSuccess) {
      toast.error(result.errorMessage);
    } else {
      toast.success(memo.trim() ? "メモを保存しました" : "メモを削除しました");
      setIsOpen(false);
    }

    setIsLoading(false);
  };

  const handleDelete = async () => {
    setIsLoading(true);

    const result = await updateMutation({
      recordId,
      notes: undefined,
    });

    if (!result.isSuccess) {
      toast.error(result.errorMessage);
    } else {
      toast.success("メモを削除しました");
      setMemo("");
      setIsOpen(false);
    }

    setIsLoading(false);
  };

  const remainingChars = MAX_MEMO_LENGTH - memo.length;
  const isOverLimit = remainingChars < 0;
  const hasMemo = !!currentMemo;

  const triggerButton =
    triggerVariant === "icon" ? (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={`p-1 h-auto ${
          hasMemo
            ? "text-warning-foreground hover:text-warning-foreground/80"
            : "text-muted-foreground hover:text-foreground"
        }`}
        title={hasMemo ? "メモを編集" : "メモを追加"}
      >
        <MessageSquare className="h-4 w-4" />
      </Button>
    ) : (
      <Button type="button" variant="outline" size="sm">
        <MessageSquare className="h-4 w-4 mr-1" />
        {hasMemo ? "メモを編集" : "メモを追加"}
      </Button>
    );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {!isControlled && <DialogTrigger asChild>{triggerButton}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <span className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {hasMemo ? "メモを編集" : "メモを追加"}
            </span>
          </DialogTitle>
          <DialogDescription>
            {medicineName
              ? `${medicineName} の服薬記録`
              : "服薬記録にメモを追加・編集できます"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="副作用の記録、感想、次回診察で伝えたいことなど..."
            rows={4}
            className="resize-none"
            aria-invalid={isOverLimit}
          />
          <div
            className={`text-xs text-right ${
              isOverLimit
                ? "text-destructive"
                : remainingChars <= 50
                  ? "text-warning-foreground"
                  : "text-muted-foreground"
            }`}
          >
            残り {remainingChars} 文字
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {hasMemo && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleDelete}
              disabled={isLoading}
              className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
            >
              削除
            </Button>
          )}
          <div className="flex gap-2 sm:ml-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              キャンセル
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isLoading || isOverLimit}
            >
              保存
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
