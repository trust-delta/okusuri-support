"use client";

import { useMutation, useQuery } from "convex/react";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Trash2,
} from "lucide-react";
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

const _TIMING_LABELS: Record<string, string> = {
  morning: "朝",
  noon: "昼",
  evening: "晩",
  bedtime: "就寝前",
  asNeeded: "頓服",
};

// 削除された処方箋に含まれる薬の一覧を表示するコンポーネント
// 注: 削除された薬も含めて表示するため、getPrescriptionMedicinesは使えません
function DeletedPrescriptionMedicinesList({
  prescriptionId: _prescriptionId,
}: {
  prescriptionId: Id<"prescriptions">;
}) {
  // 削除された薬も取得するため、ここでは実装を簡略化
  // 実際にはカスタムクエリが必要かもしれませんが、まずは簡単な実装で
  return (
    <div className="border-t pt-4">
      <div className="text-sm text-muted-foreground py-2">
        削除された薬の詳細は復元後に確認できます
      </div>
    </div>
  );
}

export function DeletedPrescriptionList({
  groupId,
}: DeletedPrescriptionListProps) {
  const [expandedPrescriptions, setExpandedPrescriptions] = useState<
    Set<string>
  >(new Set());

  const deletedPrescriptions = useQuery(
    api.medications.prescriptions.queries.getDeletedPrescriptions,
    { groupId },
  );
  const restorePrescription = useMutation(
    api.medications.prescriptions.mutations.restorePrescription,
  );
  const permanentlyDeletePrescription = useMutation(
    api.medications.prescriptions.mutations.permanentlyDeletePrescription,
  );

  // 復元確認ダイアログ
  const [restoreDialogPrescriptionId, setRestoreDialogPrescriptionId] =
    useState<Id<"prescriptions"> | null>(null);

  // 完全削除確認ダイアログ（1段階目）
  const [
    permanentDeleteDialogPrescriptionId,
    setPermanentDeleteDialogPrescriptionId,
  ] = useState<Id<"prescriptions"> | null>(null);

  // 完全削除確認ダイアログ（2段階目：最終確認）
  const [
    permanentDeleteFinalDialogPrescriptionId,
    setPermanentDeleteFinalDialogPrescriptionId,
  ] = useState<Id<"prescriptions"> | null>(null);

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

  const handleRestore = async () => {
    if (!restoreDialogPrescriptionId) return;

    try {
      await restorePrescription({
        prescriptionId: restoreDialogPrescriptionId,
      });
      toast.success("処方箋を復元しました");
      setRestoreDialogPrescriptionId(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "処方箋の復元に失敗しました",
      );
    }
  };

  const handlePermanentlyDeleteConfirm = () => {
    // 1段階目から2段階目へ
    if (!permanentDeleteDialogPrescriptionId) return;
    setPermanentDeleteFinalDialogPrescriptionId(
      permanentDeleteDialogPrescriptionId,
    );
    setPermanentDeleteDialogPrescriptionId(null);
  };

  const handlePermanentlyDelete = async () => {
    if (!permanentDeleteFinalDialogPrescriptionId) return;

    try {
      await permanentlyDeletePrescription({
        prescriptionId: permanentDeleteFinalDialogPrescriptionId,
      });
      toast.success("処方箋を完全に削除しました");
      setPermanentDeleteFinalDialogPrescriptionId(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "処方箋の完全削除に失敗しました",
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

  // Result型からデータを取得
  const deletedPrescriptionsData = deletedPrescriptions.isSuccess
    ? deletedPrescriptions.data
    : [];

  return (
    <div className="space-y-4">
      {deletedPrescriptionsData.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trash2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              削除された処方箋はありません
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {deletedPrescriptionsData.map((prescription) => {
            const isExpanded = expandedPrescriptions.has(prescription._id);
            return (
              <Card
                key={prescription._id}
                className="border-red-200 dark:border-red-900"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-muted-foreground">
                          {prescription.name}
                        </CardTitle>
                        <span className="text-xs px-2 py-1 bg-destructive/10 text-destructive rounded">
                          削除済み
                        </span>
                      </div>
                      <CardDescription className="flex flex-col gap-2 mt-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(prescription.startDate)}
                          {prescription.endDate && (
                            <> 〜 {formatDate(prescription.endDate)}</>
                          )}
                          {!prescription.endDate && "〜 継続中"}
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
                        onClick={() =>
                          setRestoreDialogPrescriptionId(prescription._id)
                        }
                        className="border-green-500 text-green-600 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-950"
                        title="復元"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          setPermanentDeleteDialogPrescriptionId(
                            prescription._id,
                          )
                        }
                        className="border-red-500 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950"
                        title="完全削除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {(prescription.notes || isExpanded) && (
                  <CardContent className="space-y-4">
                    {prescription.notes && (
                      <p className="text-sm text-muted-foreground">
                        {prescription.notes}
                      </p>
                    )}
                    {isExpanded && (
                      <DeletedPrescriptionMedicinesList
                        prescriptionId={prescription._id}
                      />
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* 復元確認ダイアログ */}
      <AlertDialog
        open={restoreDialogPrescriptionId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRestoreDialogPrescriptionId(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>処方箋を復元しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作により、処方箋と紐付く薬、服薬記録が復元されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore}>復元</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 完全削除確認ダイアログ（1段階目） */}
      <AlertDialog
        open={permanentDeleteDialogPrescriptionId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPermanentDeleteDialogPrescriptionId(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 dark:text-red-400">
              ⚠️ 警告：処方箋を完全に削除しますか？
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p className="font-semibold">この操作は取り消せません。</p>
              <p>
                処方箋に紐付く薬、スケジュール、服薬記録も全て完全に削除されます。
              </p>
              <p>本当に削除してよろしいですか？</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePermanentlyDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              次へ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 完全削除確認ダイアログ（2段階目：最終確認） */}
      <AlertDialog
        open={permanentDeleteFinalDialogPrescriptionId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPermanentDeleteFinalDialogPrescriptionId(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 dark:text-red-400">
              最終確認
            </AlertDialogTitle>
            <AlertDialogDescription>
              本当にこの処方箋とすべての関連データを完全に削除しますか？
              <br />
              <br />
              <strong>この操作は取り消せません。</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePermanentlyDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              完全に削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
