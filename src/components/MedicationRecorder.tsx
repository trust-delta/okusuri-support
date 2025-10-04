"use client";

import { useUser } from "@auth0/nextjs-auth0";
import { useMutation, useQuery } from "convex/react";
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
  const { user } = useUser();
  const today = formatJST(nowJST(), "yyyy-MM-dd");

  const todayRecords = useQuery(
    api.medications.getTodayRecords,
    user?.sub
      ? {
          auth0Id: user.sub,
          groupId,
          scheduledDate: today,
        }
      : "skip"
  );

  const recordSimple = useMutation(api.medications.recordSimpleMedication);

  const handleRecord = async (
    timing: (typeof TIMINGS)[number]["value"],
    status: "taken" | "skipped"
  ) => {
    if (!user?.sub) return;

    await recordSimple({
      auth0Id: user.sub,
      groupId,
      timing,
      scheduledDate: today,
      simpleMedicineName: TIMINGS.find((t) => t.value === timing)?.label,
      status,
    });
  };

  const getRecordStatus = (timing: (typeof TIMINGS)[number]["value"]) => {
    if (!todayRecords) return null;
    return todayRecords.find(
      (r) => r.timing === timing && r.scheduledDate === today
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
              <div className="flex items-center space-x-4">
                <span className="font-medium w-20">{timing.label}</span>
                {record && (
                  <span
                    className={`px-3 py-1 rounded-full text-sm ${
                      record.status === "taken"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {record.status === "taken" ? "服用済み" : "スキップ"}
                  </span>
                )}
              </div>

              {!record && (
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => handleRecord(timing.value, "taken")}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                  >
                    服用
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRecord(timing.value, "skipped")}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
                  >
                    スキップ
                  </button>
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
