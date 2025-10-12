"use client";

import type { FunctionReturnType } from "convex/server";
import { formatJST, nowJST } from "@/lib/date-fns";
import type { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { MEDICATION_TIMINGS } from "../constants/timings";
import { MedicationRecordActions } from "./medication-record-actions";

interface MedicationRecorderProps {
  groupId: Id<"groups">;
  records: FunctionReturnType<typeof api.medications.getTodayRecords> | null;
  today: string;
}

export function MedicationRecorder({
  groupId,
  records,
  today,
}: MedicationRecorderProps) {
  const getRecordByTiming = (timing: string) => {
    if (!records) return null;
    return records.find(
      (r) => r.timing === timing && r.scheduledDate === today,
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
        今日の服薬記録 ({formatJST(nowJST(), "M月d日(E)")})
      </h2>

      <div className="space-y-4">
        {MEDICATION_TIMINGS.map((timing) => {
          const recordStatus = getRecordByTiming(timing.value);

          return (
            <div
              key={timing.value}
              className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              <div className="flex items-center space-x-4 flex-1">
                <span className="font-medium w-20 text-gray-900 dark:text-gray-100">
                  {timing.label}
                </span>
                <MedicationRecordActions
                  groupId={groupId}
                  timing={timing.value}
                  scheduledDate={today}
                  simpleMedicineName={timing.label}
                  recordId={recordStatus?._id}
                  recordStatus={recordStatus?.status}
                />
              </div>
            </div>
          );
        })}
      </div>

      {records && records.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="font-medium mb-2 text-gray-900 dark:text-gray-100">
            記録履歴
          </h3>
          <div className="space-y-2">
            {records.map((rec) => (
              <div
                key={rec._id}
                className="text-sm text-gray-600 dark:text-gray-400"
              >
                {MEDICATION_TIMINGS.find((t) => t.value === rec.timing)?.label}{" "}
                - {rec.status === "taken" ? "服用済み" : "スキップ"}{" "}
                {rec.takenAt &&
                  `(${formatJST(new Date(rec.takenAt), "HH:mm")})`}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
