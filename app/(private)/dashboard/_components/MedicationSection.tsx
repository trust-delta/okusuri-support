"use client";

import { MedicationRecorder } from "@/features/medication";
import type { Id } from "@/schema";

interface MedicationSectionProps {
  groupId: Id<"groups">;
}

export function MedicationSection({ groupId }: MedicationSectionProps) {
  return <MedicationRecorder groupId={groupId} />;
}
