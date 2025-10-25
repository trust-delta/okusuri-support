"use client";

import { PrescriptionBasedRecorder } from "@/features/medication";
import type { Id } from "@/schema";

interface MedicationSectionProps {
  groupId: Id<"groups">;
}

export function MedicationSection({ groupId }: MedicationSectionProps) {
  return <PrescriptionBasedRecorder groupId={groupId} />;
}
