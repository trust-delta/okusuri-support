"use client";

import { useMutation } from "convex/react";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Id } from "@/schema";
import { type MedicineData, MedicineEntry } from "./MedicineEntry";

interface PrescriptionFormWithMedicinesProps {
  groupId: Id<"groups">;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function PrescriptionFormWithMedicines({
  groupId,
  onSuccess,
  onCancel,
}: PrescriptionFormWithMedicinesProps) {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [medicines, setMedicines] = useState<MedicineData[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const createPrescription = useMutation(
    api.medications.prescriptions.mutations.createPrescription,
  );

  const addMedicine = () => {
    setMedicines([
      ...medicines,
      {
        id: crypto.randomUUID(),
        name: "",
        dosage: {
          amount: "",
          unit: "回",
        },
        timings: {
          morning: false,
          noon: false,
          evening: false,
          bedtime: false,
          asNeeded: false,
        },
      },
    ]);
  };

  const updateMedicine = (index: number, medicine: MedicineData) => {
    const newMedicines = [...medicines];
    newMedicines[index] = medicine;
    setMedicines(newMedicines);
  };

  const removeMedicine = (index: number) => {
    setMedicines(medicines.filter((_, i) => i !== index));
  };

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

    // 薬のバリデーション
    for (const [i, med] of medicines.entries()) {
      if (!med.name.trim()) {
        toast.error(`薬 ${i + 1} の薬名を入力してください`);
        return;
      }
      const hasSelectedTiming = Object.values(med.timings).some((v) => v);
      if (!hasSelectedTiming) {
        toast.error(`薬 ${i + 1} のタイミングを少なくとも1つ選択してください`);
        return;
      }
    }

    // バリデーション通過後、確認ダイアログを表示
    setShowConfirmDialog(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmDialog(false);
    setIsSubmitting(true);

    try {
      // 薬のデータを変換
      const medicinesData = medicines.map((med) => {
        // 用量が入力されている場合は数値化
        const dosage =
          med.dosage.amount && med.dosage.unit
            ? {
                amount: Number.parseFloat(med.dosage.amount),
                unit: med.dosage.unit,
              }
            : undefined;

        return {
          name: med.name.trim(),
          dosage,
          timings: Object.entries(med.timings)
            .filter(([_, selected]) => selected)
            .map(([timing]) => timing) as Array<
            "morning" | "noon" | "evening" | "bedtime" | "asNeeded"
          >,
          description: med.description,
        };
      });

      await createPrescription({
        groupId,
        name: name.trim(),
        startDate,
        endDate: endDate || undefined,
        notes: notes.trim() || undefined,
        medicines: medicinesData.length > 0 ? medicinesData : undefined,
      });

      toast.success("処方箋を登録しました");
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 処方箋基本情報 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">処方箋情報</h3>

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
            <p className="text-xs text-muted-foreground">
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
            rows={2}
          />
        </div>
      </div>

      {/* 薬リスト */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">薬リスト</h3>

        {medicines.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-border rounded-lg">
            <p className="text-sm text-muted-foreground">
              薬が追加されていません。下部の「薬を追加」ボタンから追加してください。
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {medicines.map((medicine, index) => (
              <MedicineEntry
                key={medicine.id}
                index={index}
                medicine={medicine}
                onChange={(med) => updateMedicine(index, med)}
                onRemove={() => removeMedicine(index)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2 justify-between pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={addMedicine}
          disabled={isSubmitting}
        >
          <Plus className="h-4 w-4 mr-2" />
          薬を追加
        </Button>
        <div className="flex gap-2">
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
            {isSubmitting ? "保存中..." : "登録"}
          </Button>
        </div>
      </div>

      {/* 確認ダイアログ */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>処方箋を登録しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              登録後は処方箋の編集ができません。内容を確認してから登録してください。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSubmit}>
              登録する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
