"use client";

import { useMutation, useQuery } from "convex/react";
import { Calendar, Pill, Plus, Trash2 } from "lucide-react";
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

export function PrescriptionList({ groupId }: PrescriptionListProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const prescriptions = useQuery(
    api.medications.prescriptions.queries.getPrescriptions,
    { groupId },
  );
  const deletePrescription = useMutation(
    api.medications.prescriptions.mutations.deletePrescription,
  );

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
          {prescriptions.map((prescription) => (
            <Card key={prescription._id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
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
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(prescription._id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {prescription.notes && (
                <CardContent>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {prescription.notes}
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
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
