"use client";

import { useMutation, useQuery } from "convex/react";
import { Edit2, Plus, Trash2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { Id } from "@/schema";

const TIMING_LABELS: Record<string, string> = {
  morning: "朝",
  noon: "昼",
  evening: "晩",
  bedtime: "就寝前",
  asNeeded: "頓服",
};

const TIMING_KEYS = [
  "morning",
  "noon",
  "evening",
  "bedtime",
  "asNeeded",
] as const;
type TimingKey = (typeof TIMING_KEYS)[number];

const UNIT_OPTIONS = [
  { value: "回", label: "回" },
  { value: "錠", label: "錠" },
  { value: "カプセル", label: "カプセル" },
  { value: "包", label: "包" },
  { value: "mg", label: "mg" },
  { value: "g", label: "g" },
  { value: "mL", label: "mL" },
] as const;

interface MedicineFormData {
  name: string;
  description: string;
  dosageAmount: string;
  dosageUnit: string;
  timings: Record<TimingKey, boolean>;
}

const initialFormData: MedicineFormData = {
  name: "",
  description: "",
  dosageAmount: "",
  dosageUnit: "錠",
  timings: {
    morning: false,
    noon: false,
    evening: false,
    bedtime: false,
    asNeeded: false,
  },
};

interface PrescriptionMedicinesListProps {
  prescriptionId: Id<"prescriptions">;
}

export function PrescriptionMedicinesList({
  prescriptionId,
}: PrescriptionMedicinesListProps) {
  const medicines = useQuery(
    api.medications.prescriptions.queries.getPrescriptionMedicines,
    { prescriptionId },
  );

  const deleteMedicine = useMutation(api.medications.deleteMedicine);
  const updateMedicine = useMutation(api.medications.updateMedicine);
  const addMedicineToPrescription = useMutation(
    api.medications.addMedicineToPrescription,
  );

  // 削除ダイアログ
  const [deleteDialogMedicine, setDeleteDialogMedicine] = useState<{
    id: Id<"medicines">;
    name: string;
  } | null>(null);
  const recordCount = useQuery(
    api.medications.getMedicineRecordCount,
    deleteDialogMedicine ? { medicineId: deleteDialogMedicine.id } : "skip",
  );

  // 編集ダイアログ
  const [editDialogMedicine, setEditDialogMedicine] = useState<{
    id: Id<"medicines">;
    name: string;
  } | null>(null);
  const [editFormData, setEditFormData] =
    useState<MedicineFormData>(initialFormData);

  // 追加ダイアログ
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addFormData, setAddFormData] =
    useState<MedicineFormData>(initialFormData);

  const handleDeleteMedicine = async () => {
    if (!deleteDialogMedicine) return;

    try {
      await deleteMedicine({ medicineId: deleteDialogMedicine.id });
      toast.success("薬を削除しました");
      setDeleteDialogMedicine(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "薬の削除に失敗しました",
      );
    }
  };

  const openEditDialog = (medicine: NonNullable<typeof medicines>[number]) => {
    setEditDialogMedicine({ id: medicine._id, name: medicine.name });
    setEditFormData({
      name: medicine.name,
      description: medicine.description || "",
      dosageAmount: medicine.schedule?.dosage?.amount?.toString() || "",
      dosageUnit: medicine.schedule?.dosage?.unit || "錠",
      timings: {
        morning: medicine.schedule?.timings.includes("morning") || false,
        noon: medicine.schedule?.timings.includes("noon") || false,
        evening: medicine.schedule?.timings.includes("evening") || false,
        bedtime: medicine.schedule?.timings.includes("bedtime") || false,
        asNeeded: medicine.schedule?.timings.includes("asNeeded") || false,
      },
    });
  };

  const handleUpdateMedicine = async () => {
    if (!editDialogMedicine) return;

    const selectedTimings = TIMING_KEYS.filter(
      (key) => editFormData.timings[key],
    );
    if (selectedTimings.length === 0) {
      toast.error("服用タイミングを1つ以上選択してください");
      return;
    }

    if (!editFormData.name.trim()) {
      toast.error("薬名を入力してください");
      return;
    }

    try {
      await updateMedicine({
        medicineId: editDialogMedicine.id,
        name: editFormData.name.trim(),
        description: editFormData.description || undefined,
        clearDescription: !editFormData.description,
        dosage: editFormData.dosageAmount
          ? {
              amount: Number.parseFloat(editFormData.dosageAmount),
              unit: editFormData.dosageUnit,
            }
          : undefined,
        clearDosage: !editFormData.dosageAmount,
        timings: selectedTimings,
      });
      toast.success("薬を更新しました");
      setEditDialogMedicine(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "薬の更新に失敗しました",
      );
    }
  };

  const handleAddMedicine = async () => {
    const selectedTimings = TIMING_KEYS.filter(
      (key) => addFormData.timings[key],
    );
    if (selectedTimings.length === 0) {
      toast.error("服用タイミングを1つ以上選択してください");
      return;
    }

    if (!addFormData.name.trim()) {
      toast.error("薬名を入力してください");
      return;
    }

    try {
      await addMedicineToPrescription({
        prescriptionId,
        name: addFormData.name.trim(),
        description: addFormData.description || undefined,
        dosage: addFormData.dosageAmount
          ? {
              amount: Number.parseFloat(addFormData.dosageAmount),
              unit: addFormData.dosageUnit,
            }
          : undefined,
        timings: selectedTimings,
      });
      toast.success("薬を追加しました");
      setIsAddDialogOpen(false);
      setAddFormData(initialFormData);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "薬の追加に失敗しました",
      );
    }
  };

  if (medicines === undefined) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="border-t pt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          含まれる薬
        </h4>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setAddFormData(initialFormData);
            setIsAddDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" />
          薬を追加
        </Button>
      </div>

      {medicines.length === 0 ? (
        <div className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
          この処方箋には薬が登録されていません
        </div>
      ) : (
        <div className="space-y-2">
          {medicines.map((medicine) => (
            <div
              key={medicine._id}
              className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {medicine.name}
                  </div>
                  {medicine.schedule && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {medicine.schedule.timings.map((timing: string) => (
                        <span
                          key={timing}
                          className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded"
                        >
                          {TIMING_LABELS[timing] || timing}
                        </span>
                      ))}
                    </div>
                  )}
                  {medicine.schedule?.dosage && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      用量: {medicine.schedule.dosage.amount}
                      {medicine.schedule.dosage.unit}
                    </div>
                  )}
                  {medicine.description && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {medicine.description}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 ml-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEditDialog(medicine)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() =>
                      setDeleteDialogMedicine({
                        id: medicine._id,
                        name: medicine.name,
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 薬削除確認ダイアログ */}
      <AlertDialog
        open={deleteDialogMedicine !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteDialogMedicine(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              「{deleteDialogMedicine?.name}」を削除しますか？
            </AlertDialogTitle>
            <AlertDialogDescription>
              {recordCount !== undefined && recordCount > 0 ? (
                <>
                  この薬に紐付く服薬記録（{recordCount}件）も削除されます。
                  <br />
                  削除した記録は履歴から確認できます。
                </>
              ) : (
                "この薬を削除します。"
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMedicine}>
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 薬編集ダイアログ */}
      <Dialog
        open={editDialogMedicine !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditDialogMedicine(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>薬を編集</DialogTitle>
            <DialogDescription>
              「{editDialogMedicine?.name}」の情報を編集します
            </DialogDescription>
          </DialogHeader>
          <MedicineForm
            formData={editFormData}
            onChange={setEditFormData}
            submitLabel="更新"
            onSubmit={handleUpdateMedicine}
            onCancel={() => setEditDialogMedicine(null)}
          />
        </DialogContent>
      </Dialog>

      {/* 薬追加ダイアログ */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>薬を追加</DialogTitle>
            <DialogDescription>
              この処方箋に新しい薬を追加します
            </DialogDescription>
          </DialogHeader>
          <MedicineForm
            formData={addFormData}
            onChange={setAddFormData}
            submitLabel="追加"
            onSubmit={handleAddMedicine}
            onCancel={() => setIsAddDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 薬の入力フォームコンポーネント
function MedicineForm({
  formData,
  onChange,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  formData: MedicineFormData;
  onChange: (data: MedicineFormData) => void;
  submitLabel: string;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="medicine-name">薬名 *</Label>
          <Input
            id="medicine-name"
            value={formData.name}
            onChange={(e) => onChange({ ...formData, name: e.target.value })}
            placeholder="例: ロキソニン"
          />
        </div>

        <div className="space-y-2">
          <Label>用量</Label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                type="number"
                step="1"
                min="0"
                value={formData.dosageAmount}
                onChange={(e) =>
                  onChange({ ...formData, dosageAmount: e.target.value })
                }
                placeholder="数量"
              />
            </div>
            <div className="w-32">
              <Select
                value={formData.dosageUnit}
                onValueChange={(value) =>
                  onChange({ ...formData, dosageUnit: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="単位" />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>服用タイミング *（複数選択可）</Label>
          <div className="flex flex-wrap gap-4">
            {TIMING_KEYS.map((timing) => (
              <div key={timing} className="flex items-center space-x-2">
                <Checkbox
                  id={`timing-${timing}`}
                  checked={formData.timings[timing]}
                  onCheckedChange={(checked) =>
                    onChange({
                      ...formData,
                      timings: {
                        ...formData.timings,
                        [timing]: checked as boolean,
                      },
                    })
                  }
                />
                <label
                  htmlFor={`timing-${timing}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {TIMING_LABELS[timing]}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="medicine-description">備考</Label>
          <Input
            id="medicine-description"
            value={formData.description}
            onChange={(e) =>
              onChange({ ...formData, description: e.target.value })
            }
            placeholder="例: 食後に服用"
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          キャンセル
        </Button>
        <Button onClick={onSubmit}>{submitLabel}</Button>
      </DialogFooter>
    </>
  );
}
