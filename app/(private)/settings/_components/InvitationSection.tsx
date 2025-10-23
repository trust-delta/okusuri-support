"use client";

import type { Preloaded } from "convex/react";
import { usePreloadedQuery } from "convex/react";
import type { api } from "@/api";
import { InvitationCard } from "./InvitationCard";

interface InvitationSectionProps {
  preloadedGroupStatus: Preloaded<typeof api.groups.getUserGroupStatus>;
}

export function InvitationSection({
  preloadedGroupStatus,
}: InvitationSectionProps) {
  const groupStatus = usePreloadedQuery(preloadedGroupStatus);

  if (!groupStatus?.hasGroup) {
    return null;
  }

  // アクティブグループの計算
  const activeGroupId =
    groupStatus.activeGroupId || groupStatus.groups[0]?.groupId;
  const activeGroup = groupStatus.groups.find(
    (g) => g.groupId === activeGroupId,
  );

  if (!activeGroup) {
    return null;
  }

  return <InvitationCard groupId={activeGroup.groupId} />;
}
