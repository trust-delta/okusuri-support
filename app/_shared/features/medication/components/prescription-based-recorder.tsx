"use client";

import { Pill } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatJST, nowJST } from "@/lib/date-fns";
import type { Id } from "@/schema";
import { MedicationGroupedRecordsList } from "./medication-grouped-records-list";

interface PrescriptionBasedRecorderProps {
  groupId: Id<"groups">;
}

/**
 * 処方箋ベースの服薬記録コンポーネント
 * 今日の服薬記録を表示する
 */
export function PrescriptionBasedRecorder({
  groupId,
}: PrescriptionBasedRecorderProps) {
  const today = formatJST(nowJST(), "yyyy-MM-dd");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pill className="h-5 w-5" />
          今日の服薬記録 ({formatJST(nowJST(), "M月d日(E)")})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <MedicationGroupedRecordsList
          groupId={groupId}
          scheduledDate={today}
          allowGroupBySwitch={true}
          defaultGroupBy="timing"
          showBulkActions={true}
          isEditable={true}
          showUnrecordedStyle="solid"
          showRecordDetails={false}
          emptyMessage="今日服用する薬がありません"
        />
      </CardContent>
    </Card>
  );
}
