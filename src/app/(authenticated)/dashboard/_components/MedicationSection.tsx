"use client";

import type { Id } from "@/shared/lib/convex";
import { MedicationRecorder } from "@/features/medication";

interface MedicationSectionProps {
  groupId: Id<"groups">;
}

export function MedicationSection({ groupId }: MedicationSectionProps) {
  return <MedicationRecorder groupId={groupId} />;
}
