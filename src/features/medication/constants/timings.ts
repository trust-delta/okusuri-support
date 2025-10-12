export const MEDICATION_TIMINGS = [
  { value: "morning" as const, label: "朝" },
  { value: "noon" as const, label: "昼" },
  { value: "evening" as const, label: "晩" },
  { value: "bedtime" as const, label: "就寝前" },
  { value: "asNeeded" as const, label: "頓服" },
] as const;

export type MedicationTiming = (typeof MEDICATION_TIMINGS)[number]["value"];
