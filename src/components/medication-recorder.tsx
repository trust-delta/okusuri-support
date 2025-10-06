"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatJST, nowJST } from "@/lib/date-fns";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

interface MedicationRecorderProps {
  groupId: Id<"groups">;
}

const TIMINGS = [
  { value: "morning" as const, label: "朝" },
  { value: "noon" as const, label: "昼" },
  { value: "evening" as const, label: "晩" },
  { value: "bedtime" as const, label: "就寝前" },
  { value: "asNeeded" as const, label: "頓服" },
];

export function MedicationRecorder({ groupId }: MedicationRecorderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const today = formatJST(nowJST(), "yyyy-MM-dd");

  const todayRecords = useQuery(api.medicationRecords.getTodayRecords, {
    groupId,
    scheduledDate: today,
  });

  const recordMutation = useMutation(
    api.medicationRecords.recordSimpleMedication,
  );
  const deleteMutation = useMutation(
    api.medicationRecords.deleteMedicationRecord,
  );

  const handleRecord = async (
    timing: (typeof TIMINGS)[number]["value"],
    status: "taken" | "skipped",
  ) => {
    setIsLoading(true);
    try {
      await recordMutation({
        groupId,
        timing,
        scheduledDate: today,
        simpleMedicineName: TIMINGS.find((t) => t.value === timing)?.label,
        status,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "記録に失敗しました",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (recordId: Id<"medicationRecords">) => {
    setIsLoading(true);
    try {
      await deleteMutation({ recordId });
      toast.success("記録を取り消しました");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "取消しに失敗しました",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getRecordStatus = (timing: (typeof TIMINGS)[number]["value"]) => {
    if (!todayRecords) return null;
    return todayRecords.find(
      (r) => r.timing === timing && r.scheduledDate === today,
    );
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">
        今日の服薬記録 ({formatJST(nowJST(), "M月d日(E)")})
      </h2>

      <div className="space-y-4">
        {TIMINGS.map((timing) => {
          const record = getRecordStatus(timing.value);

          return (
            <div
              key={timing.value}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center space-x-4 flex-1">
                <span className="font-medium w-20">{timing.label}</span>
                {record && (
                  <>
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        record.status === "taken"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {record.status === "taken" ? "服用済み" : "スキップ"}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(record._id)}
                      disabled={isLoading}
                      className="ml-auto text-red-600 hover:text-red-800 hover:bg-red-50"
                    >
                      取消し
                    </Button>
                  </>
                )}
              </div>

              {!record && (
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    onClick={() => handleRecord(timing.value, "taken")}
                    disabled={isLoading}
                  >
                    服用
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => handleRecord(timing.value, "skipped")}
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

      {todayRecords && todayRecords.length > 0 && (
        <div className="mt-6 pt-6 border-t">
          <h3 className="font-medium mb-2">記録履歴</h3>
          <div className="space-y-2">
            {todayRecords.map((record) => (
              <div key={record._id} className="text-sm text-gray-600">
                {TIMINGS.find((t) => t.value === record.timing)?.label} -{" "}
                {record.status === "taken" ? "服用済み" : "スキップ"}{" "}
                {record.takenAt &&
                  `(${formatJST(new Date(record.takenAt), "HH:mm")})`}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
