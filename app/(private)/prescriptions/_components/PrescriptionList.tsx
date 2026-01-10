"use client";

import { useMutation, useQuery } from "convex/react";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Copy,
  ImageIcon,
  Pause,
  Pill,
  Play,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/api";
import { ImageUpload } from "@/components/ImageUpload";
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
import { Badge } from "@/components/ui/badge";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type { Id } from "@/schema";
import { PrescriptionMedicinesList } from "./PrescriptionMedicinesList";

interface PrescriptionListProps {
  groupId: Id<"groups">;
  filter: "active" | "inactive";
}

export function PrescriptionList({ groupId, filter }: PrescriptionListProps) {
  const [expandedPrescriptions, setExpandedPrescriptions] = useState<
    Set<string>
  >(new Set());

  const prescriptions = useQuery(
    api.medications.prescriptions.queries.getPrescriptions,
    { groupId },
  );
  const deletePrescription = useMutation(
    api.medications.prescriptions.mutations.deletePrescription,
  );
  const deactivatePrescription = useMutation(
    api.medications.prescriptions.mutations.deactivatePrescription,
  );
  const activatePrescription = useMutation(
    api.medications.prescriptions.mutations.activatePrescription,
  );
  const updatePrescription = useMutation(
    api.medications.prescriptions.mutations.updatePrescription,
  );
  const duplicatePrescription = useMutation(
    api.medications.prescriptions.mutations.duplicatePrescription,
  );
  const attachImage = useMutation(
    api.storage.mutations.attachImageToPrescription,
  );
  const removeImage = useMutation(
    api.storage.mutations.removeImageFromPrescription,
  );

  const [endDateDialogPrescriptionId, setEndDateDialogPrescriptionId] =
    useState<Id<"prescriptions"> | null>(null);
  const [endDateInput, setEndDateInput] = useState("");

  // 複製ダイアログ
  const [duplicateDialogPrescription, setDuplicateDialogPrescription] =
    useState<{
      id: Id<"prescriptions">;
      name: string;
    } | null>(null);
  const [duplicateStartDate, setDuplicateStartDate] = useState("");
  const [duplicateEndDate, setDuplicateEndDate] = useState("");
  const [duplicateName, setDuplicateName] = useState("");

  // 削除確認ダイアログ
  const [deleteDialogPrescriptionId, setDeleteDialogPrescriptionId] =
    useState<Id<"prescriptions"> | null>(null);

  // 無効化確認ダイアログ
  const [deactivateDialogPrescriptionId, setDeactivateDialogPrescriptionId] =
    useState<Id<"prescriptions"> | null>(null);

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

  const handleDelete = async () => {
    if (!deleteDialogPrescriptionId) return;

    try {
      await deletePrescription({ prescriptionId: deleteDialogPrescriptionId });
      toast.success("処方箋を削除しました");
      setDeleteDialogPrescriptionId(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "処方箋の削除に失敗しました",
      );
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateDialogPrescriptionId) return;

    try {
      await deactivatePrescription({
        prescriptionId: deactivateDialogPrescriptionId,
      });
      toast.success("処方箋を無効化しました");
      setDeactivateDialogPrescriptionId(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "処方箋の無効化に失敗しました",
      );
    }
  };

  const handleActivate = async (prescriptionId: Id<"prescriptions">) => {
    try {
      await activatePrescription({ prescriptionId });
      toast.success("処方箋を有効化しました");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "処方箋の有効化に失敗しました",
      );
    }
  };

  const handleSetEndDate = async () => {
    if (!endDateDialogPrescriptionId || !endDateInput) {
      toast.error("終了日を入力してください");
      return;
    }

    try {
      await updatePrescription({
        prescriptionId: endDateDialogPrescriptionId,
        endDate: endDateInput,
      });
      toast.success("終了日を設定しました");
      setEndDateDialogPrescriptionId(null);
      setEndDateInput("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "終了日の設定に失敗しました",
      );
    }
  };

  const handleClearEndDate = async (prescriptionId: Id<"prescriptions">) => {
    try {
      await updatePrescription({
        prescriptionId,
        clearEndDate: true,
      });
      toast.success("継続中に変更しました");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "終了日の削除に失敗しました",
      );
    }
  };

  const openDuplicateDialog = (
    prescriptionId: Id<"prescriptions">,
    prescriptionName: string,
  ) => {
    setDuplicateDialogPrescription({
      id: prescriptionId,
      name: prescriptionName,
    });
    setDuplicateStartDate(today);
    setDuplicateEndDate("");
    setDuplicateName(`${prescriptionName}のコピー`);
  };

  const handleDuplicate = async () => {
    if (!duplicateDialogPrescription || !duplicateStartDate) {
      toast.error("開始日を入力してください");
      return;
    }

    try {
      await duplicatePrescription({
        prescriptionId: duplicateDialogPrescription.id,
        name: duplicateName || undefined,
        startDate: duplicateStartDate,
        endDate: duplicateEndDate || undefined,
      });
      toast.success("処方箋を複製しました");
      setDuplicateDialogPrescription(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "処方箋の複製に失敗しました",
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

  // フィルタ適用
  const today = new Date().toISOString().split("T")[0] ?? "";
  const filteredPrescriptions = prescriptions.filter(
    (prescription: (typeof prescriptions)[number]) => {
      const isExpired = prescription.endDate && prescription.endDate < today;
      const isInactive = !prescription.isActive;

      if (filter === "active") {
        // 有効な処方箋: 期限内かつアクティブ
        return !isExpired && !isInactive;
      } else {
        // 無効な処方箋: 期限切れまたは無効化済み
        return isExpired || isInactive;
      }
    },
  );

  return (
    <div className="space-y-4">
      {filteredPrescriptions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Pill className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {prescriptions.length === 0
                ? "処方箋が登録されていません"
                : "該当する処方箋がありません"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 mt-6">
          {filteredPrescriptions.map(
            (prescription: (typeof filteredPrescriptions)[number]) => {
              const isExpanded = expandedPrescriptions.has(prescription._id);
              const isExpired =
                prescription.endDate && prescription.endDate < today;
              const isInactive = !prescription.isActive;

              return (
                <Card
                  key={prescription._id}
                  className={isInactive || isExpired ? "opacity-70" : ""}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle>{prescription.name}</CardTitle>
                          {isInactive && (
                            <Badge variant="secondary">無効</Badge>
                          )}
                          {isExpired && !isInactive && (
                            <Badge variant="outline">期限切れ</Badge>
                          )}
                        </div>
                        <CardDescription className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(prescription.startDate)}
                            {prescription.endDate && (
                              <> 〜 {formatDate(prescription.endDate)}</>
                            )}
                            {!prescription.endDate && "〜 継続中"}
                          </span>
                        </CardDescription>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {prescription.isActive ? (
                          <>
                            {!prescription.endDate ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEndDateDialogPrescriptionId(
                                    prescription._id,
                                  );
                                  setEndDateInput(today);
                                }}
                              >
                                終了日を設定
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleClearEndDate(prescription._id)
                                }
                              >
                                継続中に変更
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setDeactivateDialogPrescriptionId(
                                  prescription._id,
                                )
                              }
                            >
                              <Pause className="h-4 w-4 mr-1" />
                              無効化
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleActivate(prescription._id)}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            有効化
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            openDuplicateDialog(
                              prescription._id,
                              prescription.name,
                            )
                          }
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          複製
                        </Button>
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
                            setDeleteDialogPrescriptionId(prescription._id)
                          }
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
                        <>
                          <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                              <ImageIcon className="h-4 w-4" />
                              処方箋画像
                            </Label>
                            <ImageUpload
                              imageUrl={prescription.imageUrl}
                              onImageUploaded={async (storageId) => {
                                await attachImage({
                                  prescriptionId: prescription._id,
                                  storageId: storageId as Id<"_storage">,
                                });
                              }}
                              onImageRemoved={async () => {
                                await removeImage({
                                  prescriptionId: prescription._id,
                                });
                              }}
                            />
                          </div>
                          <PrescriptionMedicinesList
                            prescriptionId={prescription._id}
                          />
                        </>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            },
          )}
        </div>
      )}

      {/* 終了日設定ダイアログ */}
      <Dialog
        open={endDateDialogPrescriptionId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEndDateDialogPrescriptionId(null);
            setEndDateInput("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>終了日を設定</DialogTitle>
            <DialogDescription>
              この処方箋の終了日を設定します
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="endDate">終了日</Label>
              <Input
                id="endDate"
                type="date"
                value={endDateInput}
                onChange={(e) => setEndDateInput(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEndDateDialogPrescriptionId(null);
                setEndDateInput("");
              }}
            >
              キャンセル
            </Button>
            <Button onClick={handleSetEndDate}>設定</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <AlertDialog
        open={deleteDialogPrescriptionId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteDialogPrescriptionId(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>処方箋を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作により、処方箋と紐付く薬がゴミ箱に移動されます。ゴミ箱から復元することができます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>削除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 無効化確認ダイアログ */}
      <AlertDialog
        open={deactivateDialogPrescriptionId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeactivateDialogPrescriptionId(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>処方箋を無効化しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この処方箋を無効化すると、新しい服薬記録を作成できなくなります。既存の記録は保持されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate}>
              無効化
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 複製ダイアログ */}
      <Dialog
        open={duplicateDialogPrescription !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDuplicateDialogPrescription(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>処方箋を複製</DialogTitle>
            <DialogDescription>
              「{duplicateDialogPrescription?.name}
              」を複製して新しい処方箋を作成します。
              薬とスケジュールもコピーされます。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="duplicateName">処方箋名</Label>
              <Input
                id="duplicateName"
                type="text"
                value={duplicateName}
                onChange={(e) => setDuplicateName(e.target.value)}
                placeholder="例: 12月分の処方箋"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duplicateStartDate">開始日 *</Label>
              <Input
                id="duplicateStartDate"
                type="date"
                value={duplicateStartDate}
                onChange={(e) => setDuplicateStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duplicateEndDate">終了日（任意）</Label>
              <Input
                id="duplicateEndDate"
                type="date"
                value={duplicateEndDate}
                onChange={(e) => setDuplicateEndDate(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                未設定の場合は継続中として扱われます
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDuplicateDialogPrescription(null)}
            >
              キャンセル
            </Button>
            <Button onClick={handleDuplicate}>複製</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
