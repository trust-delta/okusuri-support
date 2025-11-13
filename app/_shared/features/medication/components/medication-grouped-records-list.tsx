"use client";

import { useQuery } from "convex/react";
import { Edit } from "lucide-react";
import { useState } from "react";
import { api } from "@/api";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatJST } from "@/lib/date-fns";
import type { Id } from "@/schema";
import { MEDICATION_TIMINGS } from "../constants/timings";
import { MedicationRecordActions } from "./medication-record-actions";
import { TimingGroupActions } from "./timing-group-actions";

/**
 * タイミング値からラベルを取得するヘルパー
 */
const getTimingLabel = (timing: string) => {
  return MEDICATION_TIMINGS.find((t) => t.value === timing)?.label || timing;
};

/**
 * タイミングの順序
 */
const TIMING_ORDER = {
  morning: 1,
  noon: 2,
  evening: 3,
  bedtime: 4,
  asNeeded: 5,
};

interface MedicationGroupedRecordsListProps {
  // 必須
  groupId: Id<"groups">;
  scheduledDate: string; // YYYY-MM-DD

  // 機能制御
  allowGroupBySwitch?: boolean; // グルーピング切り替え UI を表示 (default: false)
  defaultGroupBy?: "timing" | "prescription"; // 初期グルーピング (default: "timing")
  showBulkActions?: boolean; // まとめて操作を表示 (default: true)

  // UI制御
  isEditable?: boolean; // 編集可能か (default: true)
  showUnrecordedStyle?: "solid" | "dashed"; // 未記録のスタイル (default: "solid")
  showRecordDetails?: boolean; // 服用時刻・メモを表示 (default: false)
  showEditableBadge?: boolean; // 編集可能バッジを表示 (default: false)

  // カスタマイズ
  title?: React.ReactNode; // カスタムタイトル (なければタイトルなし)
  emptyMessage?: string; // 薬がない時のメッセージ
  showPrescriptionInTiming?: boolean; // 時間帯グループ時に処方箋名を表示 (default: true)
  showTimingInPrescription?: boolean; // 処方箋グループ時にタイミングバッジを表示 (default: true)
}

/**
 * 服薬記録のグループ化リスト
 * PrescriptionBasedRecorder と RecordDetailView の共通コンポーネント
 */
export function MedicationGroupedRecordsList({
  groupId,
  scheduledDate,
  allowGroupBySwitch = false,
  defaultGroupBy = "timing",
  showBulkActions = true,
  isEditable = true,
  showUnrecordedStyle = "solid",
  showRecordDetails = false,
  showEditableBadge = false,
  title,
  emptyMessage = "この日に服用する薬がありません",
  showPrescriptionInTiming = true,
  showTimingInPrescription = true,
}: MedicationGroupedRecordsListProps) {
  const [groupBy, setGroupBy] = useState<"timing" | "prescription">(
    defaultGroupBy,
  );

  // その日に有効な薬剤を取得
  const medications = useQuery(
    api.medications.prescriptions.queries.getActiveMedicationsForDateQuery,
    {
      groupId,
      date: scheduledDate,
    },
  );

  // その日の記録を取得
  const records = useQuery(api.medications.getTodayRecords, {
    groupId,
    scheduledDate,
  });

  // ローディング中
  if (medications === undefined || records === undefined) {
    return (
      <div className="space-y-4">
        {title && (
          <div className="flex items-center justify-between mb-4">
            {typeof title === "string" ? (
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {title}
              </h2>
            ) : (
              title
            )}
          </div>
        )}
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  // 薬がない場合
  if (medications.length === 0) {
    return (
      <div>
        {title && (
          <div className="flex items-center justify-between mb-4">
            {typeof title === "string" ? (
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {title}
              </h2>
            ) : (
              title
            )}
          </div>
        )}
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>{emptyMessage}</p>
        </div>
      </div>
    );
  }

  // 薬ごとにタイミング別に展開
  const medicationItems = medications.flatMap((med) =>
    med.timings.map((timing) => ({
      medicineId: med.medicineId,
      scheduleId: med.scheduleId,
      medicineName: med.medicineName,
      prescriptionId: med.prescriptionId,
      prescriptionName: med.prescriptionName,
      timing: timing as "morning" | "noon" | "evening" | "bedtime" | "asNeeded",
      dosage: med.dosage,
    })),
  );

  // グルーピング処理
  const grouped =
    groupBy === "timing"
      ? // 時間帯でグルーピング
        Object.entries(
          medicationItems.reduce(
            (acc, item) => {
              if (!acc[item.timing]) acc[item.timing] = [];
              acc[item.timing].push(item);
              return acc;
            },
            {} as Record<string, typeof medicationItems>,
          ),
        ).sort(
          ([a], [b]) =>
            TIMING_ORDER[a as keyof typeof TIMING_ORDER] -
            TIMING_ORDER[b as keyof typeof TIMING_ORDER],
        )
      : // 処方箋でグルーピング
        Object.entries(
          medicationItems.reduce(
            (acc, item) => {
              if (!acc[item.prescriptionName]) acc[item.prescriptionName] = [];
              acc[item.prescriptionName].push(item);
              return acc;
            },
            {} as Record<string, typeof medicationItems>,
          ),
        ).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-6">
      {/* ヘッダー部分 */}
      {(title || allowGroupBySwitch || showEditableBadge) && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {title &&
              (typeof title === "string" ? (
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {title}
                </h2>
              ) : (
                title
              ))}
            {showEditableBadge && isEditable && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Edit className="h-3 w-3" />
                編集可能
              </Badge>
            )}
          </div>
          {allowGroupBySwitch && (
            <Select
              value={groupBy}
              onValueChange={(v) => setGroupBy(v as typeof groupBy)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="timing">時間帯でグループ</SelectItem>
                <SelectItem value="prescription">処方箋でグループ</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* グループごとの薬リスト */}
      {grouped.map(([groupName, items]) => {
        // グループ内の薬の記録状態を取得
        const itemsWithRecordStatus = items.map((item) => {
          const record = records?.find(
            (r) => r.medicineId === item.medicineId && r.timing === item.timing,
          );
          return {
            medicineId: item.medicineId,
            scheduleId: item.scheduleId,
            medicineName: item.medicineName,
            hasRecord: !!record,
          };
        });

        return (
          <div key={groupName} className="space-y-3">
            {/* グループ見出しとまとめて操作ボタン */}
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {groupBy === "timing" ? getTimingLabel(groupName) : groupName}
              </h3>
              {/* 時間帯でグルーピング & まとめて操作表示 & 編集可能の場合のみ */}
              {groupBy === "timing" && showBulkActions && isEditable && (
                <TimingGroupActions
                  groupId={groupId}
                  timing={
                    groupName as
                      | "morning"
                      | "noon"
                      | "evening"
                      | "bedtime"
                      | "asNeeded"
                  }
                  scheduledDate={scheduledDate}
                  items={itemsWithRecordStatus}
                />
              )}
            </div>

            {/* グループ内の薬 */}
            <div className="space-y-2">
              {items.map((item, index) => {
                const record = records?.find(
                  (r) =>
                    r.medicineId === item.medicineId &&
                    r.timing === item.timing,
                );

                const hasRecord = !!record;

                // 未記録時のスタイル
                const unrecordedClass =
                  showUnrecordedStyle === "dashed"
                    ? "border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50"
                    : "border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800";

                const recordedClass =
                  "border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20";

                return (
                  <div
                    key={`${item.medicineId}-${item.timing}-${index}`}
                    className={`flex flex-col gap-2 p-4 rounded-lg transition-all ${
                      hasRecord ? recordedClass : unrecordedClass
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {item.medicineName}
                          </span>
                          {/* 未記録ラベル (dashed スタイル時のみ) */}
                          {!hasRecord && showUnrecordedStyle === "dashed" && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                              (未記録)
                            </span>
                          )}
                          {/* 処方箋グループ時にタイミングバッジを表示 */}
                          {groupBy === "prescription" &&
                            showTimingInPrescription && (
                              <span className="text-sm px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                                {getTimingLabel(item.timing)}
                              </span>
                            )}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {/* 時間帯グループ時に処方箋名を表示 */}
                          {groupBy === "timing" &&
                            showPrescriptionInTiming &&
                            item.prescriptionName}
                          {item.dosage &&
                            ` · ${item.dosage.amount}${item.dosage.unit}`}
                        </div>
                        {/* 記録詳細 (メモ・服用時刻) */}
                        {showRecordDetails && (
                          <>
                            {record?.notes && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 p-2 bg-gray-50 dark:bg-gray-900 rounded">
                                メモ: {record.notes}
                              </p>
                            )}
                            {record?.takenAt && (
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                服用時刻:{" "}
                                {formatJST(new Date(record.takenAt), "HH:mm")}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                      {/* 編集可能な場合のみアクションボタンを表示 */}
                      {isEditable && (
                        <MedicationRecordActions
                          groupId={groupId}
                          timing={item.timing}
                          scheduledDate={scheduledDate}
                          medicineId={item.medicineId}
                          scheduleId={item.scheduleId}
                          recordId={record?._id}
                          recordStatus={record?.status}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
