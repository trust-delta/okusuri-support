"use client";

import { useMutation, useQuery } from "convex/react";
import { Calendar, ChevronDown, ChevronUp, Pill, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { Id } from "@/schema";
import { PrescriptionFormWithMedicines } from "./PrescriptionFormWithMedicines";

interface PrescriptionListProps {
  groupId: Id<"groups">;
}

const TIMING_LABELS: Record<string, string> = {
  morning: "朝",
  noon: "昼",
  evening: "晩",
  bedtime: "就寝前",
  asNeeded: "頓服",
};

// 処方箋に含まれる薬の一覧を表示するコンポーネント
function PrescriptionMedicinesList({
  prescriptionId,
}: {
  prescriptionId: Id<"prescriptions">;
}) {
  const medicines = useQuery(
    api.medications.prescriptions.queries.getPrescriptionMedicines,
    { prescriptionId },
  );

  if (medicines === undefined) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (medicines.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
        この処方箋には薬が登録されていません
      </div>
    );
  }

  return (
    <div className="border-t pt-4">
      <h4 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">
        含まれる薬
      </h4>
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
                    {medicine.schedule.timings.map((timing) => (
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
                    用量: {medicine.schedule.dosage}
                  </div>
                )}
                {medicine.description && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {medicine.description}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PrescriptionList({ groupId }: PrescriptionListProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [expandedPrescriptions, setExpandedPrescriptions] = useState<Set<string>>(new Set());

  const prescriptions = useQuery(
    api.medications.prescriptions.queries.getPrescriptions,
    { groupId },
  );
  const deletePrescription = useMutation(
    api.medications.prescriptions.mutations.deletePrescription,
  );

  const toggleExpanded = (prescriptionId: string) => {
    setExpandedPrescriptions((prev) => {
      const next = new Set(prev);
      if (next.has(prescriptionId)) {
        next.delete(prescriptionId);
      } else {
        next.add(prescriptionId);
      }
      return next;
    });
  };

  const handleDelete = async (prescriptionId: Id<"prescriptions">) => {
    if (
      !confirm(
        "この処方箋を削除しますか？\n（紐付く薬も一緒に削除されます）",
      )
    ) {
      return;
    }

    try {
      await deletePrescription({ prescriptionId });
      toast.success("処方箋を削除しました");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "処方箋の削除に失敗しました",
      );
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (prescriptions === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">処方箋管理</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            処方箋を登録して、薬の有効期間を管理できます
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          処方箋を登録
        </Button>
      </div>

      {prescriptions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Pill className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              処方箋が登録されていません
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              最初の処方箋を登録
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {prescriptions.map((prescription) => {
            const isExpanded = expandedPrescriptions.has(prescription._id);
            return (
              <Card key={prescription._id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle>{prescription.name}</CardTitle>
                      <CardDescription className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(prescription.startDate)}
                          {prescription.endDate && (
                            <>
                              {" "}
                              〜 {formatDate(prescription.endDate)}
                            </>
                          )}
                          {!prescription.endDate && <> 〜 継続中</>}
                        </span>
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpanded(prescription._id)}
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="h-4 w-4 mr-1" />
                            閉じる
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4 mr-1" />
                            詳細
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDelete(prescription._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {(prescription.notes || isExpanded) && (
                  <CardContent className="space-y-4">
                    {prescription.notes && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {prescription.notes}
                      </p>
                    )}
                    {isExpanded && (
                      <PrescriptionMedicinesList prescriptionId={prescription._id} />
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* 新規作成ダイアログ */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>処方箋を登録</DialogTitle>
            <DialogDescription>
              処方箋の情報と薬を入力してください
            </DialogDescription>
          </DialogHeader>
          <PrescriptionFormWithMedicines
            groupId={groupId}
            onSuccess={() => setIsCreateDialogOpen(false)}
            onCancel={() => setIsCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
