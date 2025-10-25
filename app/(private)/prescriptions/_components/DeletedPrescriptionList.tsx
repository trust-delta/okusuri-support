"use client";

import { useMutation, useQuery } from "convex/react";
import { Calendar, ChevronDown, ChevronUp, RotateCcw, Trash2 } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import type { Id } from "@/schema";

interface DeletedPrescriptionListProps {
  groupId: Id<"groups">;
}

const TIMING_LABELS: Record<string, string> = {
  morning: "朝",
  noon: "昼",
  evening: "晩",
  bedtime: "就寝前",
  asNeeded: "頓服",
};

// 削除された処方箋に含まれる薬の一覧を表示するコンポーネント
// 注: 削除された薬も含めて表示するため、getPrescriptionMedicinesは使えません
function DeletedPrescriptionMedicinesList({
  prescriptionId,
}: {
  prescriptionId: Id<"prescriptions">;
}) {
  // 削除された薬も取得するため、ここでは実装を簡略化
  // 実際にはカスタムクエリが必要かもしれませんが、まずは簡単な実装で
  return (
    <div className="border-t pt-4">
      <div className="text-sm text-gray-500 dark:text-gray-400 py-2">
        削除された薬の詳細は復元後に確認できます
      </div>
    </div>
  );
}

export function DeletedPrescriptionList({ groupId }: DeletedPrescriptionListProps) {
  const [expandedPrescriptions, setExpandedPrescriptions] = useState<Set<string>>(new Set());

  const deletedPrescriptions = useQuery(
    api.medications.prescriptions.queries.getDeletedPrescriptions,
    { groupId },
  );
  const restorePrescription = useMutation(
    api.medications.prescriptions.mutations.restorePrescription,
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

  const handleRestore = async (prescriptionId: Id<"prescriptions">) => {
    if (
      !confirm(
        "この処方箋を復元しますか？\n（紐付く薬と記録も一緒に復元されます）",
      )
    ) {
      return;
    }

    try {
      await restorePrescription({ prescriptionId });
      toast.success("処方箋を復元しました");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "処方箋の復元に失敗しました",
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

  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (deletedPrescriptions === undefined) {
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
      {deletedPrescriptions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trash2 className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              削除された処方箋はありません
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {deletedPrescriptions.map((prescription) => {
            const isExpanded = expandedPrescriptions.has(prescription._id);
            return (
              <Card key={prescription._id} className="border-red-200 dark:border-red-900">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-gray-500 dark:text-gray-400">
                          {prescription.name}
                        </CardTitle>
                        <span className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">
                          削除済み
                        </span>
                      </div>
                      <CardDescription className="flex flex-col gap-2 mt-2">
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
                        {prescription.deletedAt && (
                          <span className="text-xs text-red-600 dark:text-red-400">
                            削除日時: {formatDateTime(prescription.deletedAt)}
                          </span>
                        )}
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
                        onClick={() => handleRestore(prescription._id)}
                        className="border-green-500 text-green-600 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-950"
                      >
                        <RotateCcw className="h-4 w-4" />
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
                      <DeletedPrescriptionMedicinesList prescriptionId={prescription._id} />
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
