import type { MedicationTiming } from "../types/timing";

export const MEDICATION_TIMINGS: ReadonlyArray<{
  value: MedicationTiming;
  label: string;
}> = [
  { value: "morning", label: "朝" },
  { value: "noon", label: "昼" },
  { value: "evening", label: "晩" },
  { value: "bedtime", label: "就寝前" },
  { value: "asNeeded", label: "頓服" },
] as const;
