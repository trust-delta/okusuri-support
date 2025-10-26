"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Id } from "@/schema";

interface PrescriptionFormProps {
  groupId: Id<"groups">;
  prescriptionId?: Id<"prescriptions">;
  initialData?: {
    name: string;
    startDate: string;
    endDate?: string;
    notes?: string;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function PrescriptionForm({
  groupId,
  prescriptionId,
  initialData,
  onSuccess,
  onCancel,
}: PrescriptionFormProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [startDate, setStartDate] = useState(initialData?.startDate || "");
  const [endDate, setEndDate] = useState(initialData?.endDate || "");
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createPrescription = useMutation(
    api.medications.prescriptions.mutations.createPrescription,
  );
  const updatePrescription = useMutation(
    api.medications.prescriptions.mutations.updatePrescription,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("処方箋名を入力してください");
      return;
    }

    if (!startDate) {
      toast.error("開始日を入力してください");
      return;
    }

    if (endDate && startDate > endDate) {
      toast.error("終了日は開始日より後である必要があります");
      return;
    }

    setIsSubmitting(true);

    try {
      if (prescriptionId) {
        // 更新
        await updatePrescription({
          prescriptionId,
          name: name.trim(),
          startDate,
          endDate: endDate || undefined,
          notes: notes.trim() || undefined,
        });
        toast.success("処方箋を更新しました");
      } else {
        // 新規作成
        await createPrescription({
          groupId,
          name: name.trim(),
          startDate,
          endDate: endDate || undefined,
          notes: notes.trim() || undefined,
        });
        toast.success("処方箋を登録しました");
      }

      onSuccess?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "処方箋の保存に失敗しました",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">処方箋名 *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: 10月分の処方箋、内科の風邪薬"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">開始日 *</Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="endDate">終了日（オプション）</Label>
          <Input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            未設定の場合は継続中として扱われます
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">メモ（オプション）</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="医療機関名、処方目的など"
          rows={3}
        />
      </div>

      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            キャンセル
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "保存中..." : prescriptionId ? "更新" : "登録"}
        </Button>
      </div>
    </form>
  );
}
