"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Id } from "@/schema";

interface InitializeInventoryDialogProps {
  medicineId: Id<"medicines">;
  medicineName: string;
  defaultUnit?: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

/**
 * 残量追跡初期化ダイアログ
 */
export function InitializeInventoryDialog({
  medicineId,
  medicineName,
  defaultUnit = "錠",
  trigger,
  onSuccess,
}: InitializeInventoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [initialQuantity, setInitialQuantity] = useState(0);
  const [unit, setUnit] = useState(defaultUnit);
  const [warningThreshold, setWarningThreshold] = useState<number | undefined>(
    undefined,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initializeInventory = useMutation(api.medications.initializeInventory);

  const handleSubmit = async () => {
    if (initialQuantity < 0) return;

    setIsSubmitting(true);
    try {
      const result = await initializeInventory({
        medicineId,
        initialQuantity,
        unit,
        warningThreshold,
      });

      if (!result.isSuccess) {
        console.error(result.errorMessage);
        return;
      }

      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error("残量追跡の初期化に失敗しました", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            残量追跡を開始
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>残量追跡を開始</DialogTitle>
          <DialogDescription>
            {medicineName}の残量追跡を設定します
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 初期残量 */}
          <div className="space-y-2">
            <Label htmlFor="initialQuantity">現在の残量</Label>
            <div className="flex items-center gap-2">
              <Input
                id="initialQuantity"
                type="number"
                min={0}
                value={initialQuantity}
                onChange={(e) => setInitialQuantity(Number(e.target.value))}
                className="w-24"
              />
              <Input
                id="unit"
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-20"
                placeholder="単位"
              />
            </div>
          </div>

          {/* 警告閾値 */}
          <div className="space-y-2">
            <Label htmlFor="warningThreshold">警告閾値（任意）</Label>
            <div className="flex items-center gap-2">
              <Input
                id="warningThreshold"
                type="number"
                min={0}
                value={warningThreshold ?? ""}
                onChange={(e) =>
                  setWarningThreshold(
                    e.target.value ? Number(e.target.value) : undefined,
                  )
                }
                className="w-24"
                placeholder="未設定"
              />
              <span className="text-muted-foreground">{unit}以下で警告</span>
            </div>
            <p className="text-xs text-muted-foreground">
              残量がこの数値以下になると通知されます
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "設定中..." : "追跡を開始"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
