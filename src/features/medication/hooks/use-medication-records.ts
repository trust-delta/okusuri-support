import { useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  MEDICATION_TIMINGS,
  type MedicationTiming,
} from "../constants/timings";

export function useMedicationRecords(groupId: Id<"groups">, date: string) {
  const [isLoading, setIsLoading] = useState(false);

  const records = useQuery(api.medicationRecords.getTodayRecords, {
    groupId,
    scheduledDate: date,
  });

  const recordMutation = useMutation(
    api.medicationRecords.recordSimpleMedication,
  );
  const deleteMutation = useMutation(
    api.medicationRecords.deleteMedicationRecord,
  );

  const record = useCallback(
    async (timing: MedicationTiming, status: "taken" | "skipped") => {
      setIsLoading(true);
      try {
        await recordMutation({
          groupId,
          timing,
          scheduledDate: date,
          simpleMedicineName: MEDICATION_TIMINGS.find((t) => t.value === timing)
            ?.label,
          status,
        });
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "記録に失敗しました",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [groupId, date, recordMutation],
  );

  const deleteRecord = useCallback(
    async (recordId: Id<"medicationRecords">) => {
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
    },
    [deleteMutation],
  );

  const getRecordByTiming = useCallback(
    (timing: MedicationTiming) => {
      if (!records) return null;
      return records.find(
        (r) => r.timing === timing && r.scheduledDate === date,
      );
    },
    [records, date],
  );

  return {
    records,
    record,
    deleteRecord,
    getRecordByTiming,
    isLoading,
  };
}
