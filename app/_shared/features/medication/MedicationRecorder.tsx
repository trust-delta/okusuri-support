"use client";

import { useQuery } from "convex/react";
import { api } from "@/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatJST, nowJST } from "@/lib/date-fns";
import type { Id } from "@/schema";
import { MEDICATION_TIMINGS } from "./constants";
import { MedicationRecordActions } from "./MedicationRecordActions";

interface MedicationRecorderProps {
  groupId: Id<"groups">;
}

export function MedicationRecorder({ groupId }: MedicationRecorderProps) {
  const today = formatJST(nowJST(), "yyyy-MM-dd");
  const records = useQuery(api.medications.getTodayRecords, {
    groupId,
    scheduledDate: today,
  });

  const getRecordByTiming = (timing: string) => {
    if (!records) return null;
    return records.find(
      (r: (typeof records)[number]) =>
        r.timing === timing && r.scheduledDate === today,
    );
  };

  // ローディング中はスケルトンを表示
  if (records === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            今日の服薬記録 ({formatJST(nowJST(), "M月d日(E)")})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {MEDICATION_TIMINGS.map((timing) => (
            <div
              key={timing.value}
              className="flex items-center justify-between p-4 border border-border rounded-lg"
            >
              <div className="flex items-center space-x-4 flex-1">
                <Skeleton className="h-6 w-20" />
                <div className="flex space-x-2">
                  <Skeleton className="h-10 w-20" />
                  <Skeleton className="h-10 w-24" />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          今日の服薬記録 ({formatJST(nowJST(), "M月d日(E)")})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {MEDICATION_TIMINGS.map((timing) => {
          const recordStatus = getRecordByTiming(timing.value);

          return (
            <div
              key={timing.value}
              className="flex items-center justify-between p-4 border border-border rounded-lg"
            >
              <div className="flex items-center space-x-4 flex-1">
                <span className="font-medium w-20 text-foreground">
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

        {records && records.length > 0 && (
          <div className="mt-6 pt-6 border-t border-border">
            <h3 className="font-medium mb-2 text-foreground">記録履歴</h3>
            <div className="space-y-2">
              {records.map((rec: (typeof records)[number]) => (
                <div key={rec._id} className="text-sm text-muted-foreground">
                  {
                    MEDICATION_TIMINGS.find((t) => t.value === rec.timing)
                      ?.label
                  }{" "}
                  - {rec.status === "taken" ? "服用済み" : "スキップ"}{" "}
                  {rec.takenAt &&
                    `(${formatJST(new Date(rec.takenAt), "HH:mm")})`}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
