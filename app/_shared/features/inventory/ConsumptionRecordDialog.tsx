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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import type { Id } from "@/schema";

interface ConsumptionRecordDialogProps {
  inventoryId: Id<"medicineInventory">;
  medicineName: string;
  currentQuantity: number;
  unit: string;
  trigger?: React.ReactNode;
}

type ConsumptionType = "extra" | "lost" | "refill" | "adjustment";

const CONSUMPTION_LABELS: Record<ConsumptionType, string> = {
  extra: "追加服用",
  lost: "紛失",
  refill: "補充",
  adjustment: "数量調整",
};

const CONSUMPTION_DESCRIPTIONS: Record<ConsumptionType, string> = {
  extra: "予定より多く服用した場合",
  lost: "薬を紛失した場合",
  refill: "処方箋受け取りなどで補充した場合",
  adjustment: "実際の残量に合わせて調整する場合",
};

/**
 * 消費記録ダイアログ
 * 予定外消費（追加服用、紛失）や補充を記録
 */
export function ConsumptionRecordDialog({
  inventoryId,
  medicineName,
  currentQuantity,
  unit,
  trigger,
}: ConsumptionRecordDialogProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ConsumptionType>("extra");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const recordUnexpected = useMutation(
    api.medications.recordUnexpectedConsumption,
  );
  const recordRefill = useMutation(api.medications.recordRefill);
  const adjustQuantity = useMutation(api.medications.adjustQuantity);

  const handleSubmit = async () => {
    if (quantity <= 0 && type !== "adjustment") return;

    setIsSubmitting(true);
    try {
      if (type === "extra" || type === "lost") {
        const result = await recordUnexpected({
          inventoryId,
          consumptionType: type,
          quantity,
          reason: reason || undefined,
        });
        if (!result.isSuccess) {
          console.error(result.errorMessage);
          return;
        }
      } else if (type === "refill") {
        const result = await recordRefill({
          inventoryId,
          quantity,
          reason: reason || undefined,
        });
        if (!result.isSuccess) {
          console.error(result.errorMessage);
          return;
        }
      } else if (type === "adjustment") {
        const result = await adjustQuantity({
          inventoryId,
          newQuantity: quantity,
          reason: reason || undefined,
        });
        if (!result.isSuccess) {
          console.error(result.errorMessage);
          return;
        }
      }

      // 成功時はダイアログを閉じてリセット
      setOpen(false);
      setType("extra");
      setQuantity(1);
      setReason("");
    } catch (error) {
      console.error("消費記録の作成に失敗しました", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getQuantityLabel = () => {
    if (type === "adjustment") return "調整後の残量";
    if (type === "refill") return "補充量";
    return "消費量";
  };

  const getPreviewText = () => {
    if (type === "adjustment") {
      return `現在 ${currentQuantity}${unit} → ${quantity}${unit}`;
    }
    if (type === "refill") {
      return `現在 ${currentQuantity}${unit} + ${quantity}${unit} = ${currentQuantity + quantity}${unit}`;
    }
    const after = Math.max(0, currentQuantity - quantity);
    return `現在 ${currentQuantity}${unit} - ${quantity}${unit} = ${after}${unit}`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            残量を調整
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>残量を記録</DialogTitle>
          <DialogDescription>
            {medicineName}の残量を調整します
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 記録タイプ選択 */}
          <div className="space-y-2">
            <Label>記録タイプ</Label>
            <RadioGroup
              value={type}
              onValueChange={(v) => {
                setType(v as ConsumptionType);
                if (v === "adjustment") {
                  setQuantity(currentQuantity);
                } else {
                  setQuantity(1);
                }
              }}
              className="grid grid-cols-2 gap-2"
            >
              {(Object.keys(CONSUMPTION_LABELS) as ConsumptionType[]).map(
                (t) => (
                  <div key={t} className="flex items-start space-x-2">
                    <RadioGroupItem value={t} id={t} className="mt-1" />
                    <Label htmlFor={t} className="flex flex-col cursor-pointer">
                      <span className="font-medium">
                        {CONSUMPTION_LABELS[t]}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {CONSUMPTION_DESCRIPTIONS[t]}
                      </span>
                    </Label>
                  </div>
                ),
              )}
            </RadioGroup>
          </div>

          {/* 数量入力 */}
          <div className="space-y-2">
            <Label htmlFor="quantity">{getQuantityLabel()}</Label>
            <div className="flex items-center gap-2">
              <Input
                id="quantity"
                type="number"
                min={type === "adjustment" ? 0 : 1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-24"
              />
              <span className="text-muted-foreground">{unit}</span>
            </div>
            <p className="text-sm text-muted-foreground">{getPreviewText()}</p>
          </div>

          {/* 理由入力 */}
          <div className="space-y-2">
            <Label htmlFor="reason">理由（任意）</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                type === "extra"
                  ? "例: 痛みが強かったため追加で服用"
                  : type === "lost"
                    ? "例: 外出時に落としてしまった"
                    : type === "refill"
                      ? "例: 処方箋受け取り"
                      : "例: 実際の残量を確認して修正"
              }
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            キャンセル
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || (quantity <= 0 && type !== "adjustment")}
          >
            {isSubmitting ? "記録中..." : "記録する"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
