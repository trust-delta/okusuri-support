"use client";

import { Button } from "@/components/ui/button";
import { formatJST, nowJST } from "@/lib/date-fns";
import type { Id } from "../../../../convex/_generated/dataModel";
import { MEDICATION_TIMINGS } from "../constants/timings";
import { useMedicationRecords } from "../hooks/use-medication-records";

interface MedicationRecorderProps {
  groupId: Id<"groups">;
}

export function MedicationRecorder({ groupId }: MedicationRecorderProps) {
  const today = formatJST(nowJST(), "yyyy-MM-dd");
  const { record, deleteRecord, getRecordByTiming, records, isLoading } =
    useMedicationRecords(groupId, today);

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
                {recordStatus && (
                  <>
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        recordStatus.status === "taken"
                          ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                      }`}
                    >
                      {recordStatus.status === "taken"
                        ? "服用済み"
                        : "スキップ"}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteRecord(recordStatus._id)}
                      disabled={isLoading}
                      className="ml-auto text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      取消し
                    </Button>
                  </>
                )}
              </div>

              {!recordStatus && (
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    onClick={() => record(timing.value, "taken")}
                    disabled={isLoading}
                  >
                    服用
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => record(timing.value, "skipped")}
                    disabled={isLoading}
                  >
                    スキップ
                  </Button>
                </div>
              )}
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
