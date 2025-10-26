"use client";

import { useQuery } from "convex/react";
import { Pill } from "lucide-react";
import { useState } from "react";
import { api } from "@/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatJST, nowJST } from "@/lib/date-fns";
import type { Id } from "@/schema";
import { MEDICATION_TIMINGS } from "../constants/timings";
import { MedicationRecordActions } from "./medication-record-actions";

// タイミング値からラベルを取得するヘルパー
const getTimingLabel = (timing: string) => {
  return MEDICATION_TIMINGS.find((t) => t.value === timing)?.label || timing;
};

// タイミングの順序
const TIMING_ORDER = {
  morning: 1,
  noon: 2,
  evening: 3,
  bedtime: 4,
  asNeeded: 5,
};

interface PrescriptionBasedRecorderProps {
  groupId: Id<"groups">;
}

export function PrescriptionBasedRecorder({
  groupId,
}: PrescriptionBasedRecorderProps) {
  const today = formatJST(nowJST(), "yyyy-MM-dd");
  const [groupBy, setGroupBy] = useState<"timing" | "prescription">("timing");

  // 今日有効な薬を取得
  const medications = useQuery(
    api.medications.prescriptions.queries.getActiveMedicationsForDateQuery,
    {
      groupId,
      date: today,
    },
  );

  // 今日の記録を取得
  const records = useQuery(api.medications.getTodayRecords, {
    groupId,
    scheduledDate: today,
  });

  // ローディング中
  if (medications === undefined || records === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            今日の服薬記録 ({formatJST(nowJST(), "M月d日(E)")})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  // 薬がない場合
  if (medications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            今日の服薬記録 ({formatJST(nowJST(), "M月d日(E)")})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>今日服用する薬がありません</p>
            <p className="text-sm mt-2">
              処方箋を登録すると、ここに表示されます
            </p>
          </div>
        </CardContent>
      </Card>
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            今日の服薬記録 ({formatJST(nowJST(), "M月d日(E)")})
          </CardTitle>
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
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {grouped.map(([groupName, items]) => (
          <div key={groupName} className="space-y-3">
            {/* グループ見出し */}
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 border-b pb-1">
              {groupBy === "timing" ? getTimingLabel(groupName) : groupName}
            </h3>

            {/* グループ内の薬 */}
            <div className="space-y-2">
              {items.map((item, index) => {
                const record = records?.find(
                  (r) =>
                    r.medicineId === item.medicineId &&
                    r.timing === item.timing,
                );

                return (
                  <div
                    key={`${item.medicineId}-${item.timing}-${index}`}
                    className="flex flex-col gap-2 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {item.medicineName}
                          </span>
                          {groupBy === "prescription" && (
                            <span className="text-sm px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                              {getTimingLabel(item.timing)}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {groupBy === "timing" && item.prescriptionName}
                          {item.dosage && ` · ${item.dosage}`}
                        </div>
                      </div>
                      <MedicationRecordActions
                        groupId={groupId}
                        timing={item.timing}
                        scheduledDate={today}
                        medicineId={item.medicineId}
                        scheduleId={item.scheduleId}
                        recordId={record?._id}
                        recordStatus={record?.status}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
