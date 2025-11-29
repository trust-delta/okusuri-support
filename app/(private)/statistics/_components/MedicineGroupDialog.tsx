"use client";

import { useMutation } from "convex/react";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Id } from "@/schema";

interface MedicineGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: Id<"groups">;
  initialMedicineNames?: string[];
}

export function MedicineGroupDialog({
  open,
  onOpenChange,
  groupId,
  initialMedicineNames = [],
}: MedicineGroupDialogProps) {
  const [canonicalName, setCanonicalName] = useState("");
  const [selectedMedicines, setSelectedMedicines] = useState<Set<string>>(
    new Set(initialMedicineNames),
  );
  const [customMedicine, setCustomMedicine] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createMedicineGroup = useMutation(
    api.medications.groups.mutations.createMedicineGroup,
  );

  // 初期値が変更されたら反映
  useEffect(() => {
    if (initialMedicineNames.length > 0) {
      setSelectedMedicines(new Set(initialMedicineNames));
      // 最初の薬名を代表名として提案
      const firstName = initialMedicineNames[0];
      if (firstName) {
        setCanonicalName(firstName);
      }
    }
  }, [initialMedicineNames]);

  const handleToggleMedicine = (medicine: string) => {
    const newSet = new Set(selectedMedicines);
    if (newSet.has(medicine)) {
      newSet.delete(medicine);
    } else {
      newSet.add(medicine);
    }
    setSelectedMedicines(newSet);
  };

  const handleAddCustomMedicine = () => {
    if (customMedicine.trim()) {
      const newSet = new Set(selectedMedicines);
      newSet.add(customMedicine.trim());
      setSelectedMedicines(newSet);
      setCustomMedicine("");
    }
  };

  const handleSubmit = async () => {
    if (!canonicalName.trim()) {
      toast.error("代表名を入力してください");
      return;
    }

    if (selectedMedicines.size === 0) {
      toast.error("少なくとも1つの薬を選択してください");
      return;
    }

    setIsSubmitting(true);

    try {
      await createMedicineGroup({
        groupId,
        canonicalName: canonicalName.trim(),
        medicineNames: Array.from(selectedMedicines),
      });

      toast.success("薬名グループを作成しました");
      onOpenChange(false);

      // フォームをリセット
      setCanonicalName("");
      setSelectedMedicines(new Set());
      setCustomMedicine("");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "薬名グループの作成に失敗しました",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>薬名を統合</DialogTitle>
          <DialogDescription>
            表記ゆれのある薬名を1つの代表名にまとめて、統計を正確に表示します。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 代表名 */}
          <div className="space-y-2">
            <Label htmlFor="canonical-name">代表名 *</Label>
            <Input
              id="canonical-name"
              value={canonicalName}
              onChange={(e) => setCanonicalName(e.target.value)}
              placeholder="例: ロキソニン"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              統計に表示される名前です
            </p>
          </div>

          {/* 統合する薬名 */}
          <div className="space-y-2">
            <Label>統合する薬名 *</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              {Array.from(selectedMedicines).map((medicine) => (
                <div
                  key={medicine}
                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
                >
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`medicine-${medicine}`}
                      checked
                      onCheckedChange={() => handleToggleMedicine(medicine)}
                    />
                    <label
                      htmlFor={`medicine-${medicine}`}
                      className="text-sm font-medium leading-none"
                    >
                      {medicine}
                    </label>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleToggleMedicine(medicine)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* カスタム薬名追加 */}
          <div className="space-y-2">
            <Label htmlFor="custom-medicine">薬名を追加</Label>
            <div className="flex gap-2">
              <Input
                id="custom-medicine"
                value={customMedicine}
                onChange={(e) => setCustomMedicine(e.target.value)}
                placeholder="薬名を入力"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCustomMedicine();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddCustomMedicine}
              >
                追加
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            キャンセル
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "作成中..." : "統合する"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
