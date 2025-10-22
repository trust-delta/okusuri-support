"use client";

import { MedicationRecorder } from "@/features/medication";
import type { Id } from "@/lib/convex";

interface MedicationSectionProps {
  groupId: Id<"groups">;
}

export function MedicationSection({ groupId }: MedicationSectionProps) {
  return <MedicationRecorder groupId={groupId} />;
}
