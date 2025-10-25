"use client";

import type { Preloaded } from "convex/react";
import { usePreloadedQuery } from "convex/react";
import { useSearchParams } from "next/navigation";
import type { api } from "@/api";
import type { Id } from "@/schema";
import { InvitationCard } from "./InvitationCard";

interface InvitationSectionProps {
  preloadedGroupStatus: Preloaded<typeof api.groups.getUserGroupStatus>;
}

export function InvitationSection({
  preloadedGroupStatus,
}: InvitationSectionProps) {
  const groupStatus = usePreloadedQuery(preloadedGroupStatus);
  const searchParams = useSearchParams();

  if (!groupStatus?.hasGroup) {
    return null;
  }

  // URLパラメータからgroupIdを取得、なければDBのactiveGroupIdまたは最初のグループ
  const urlGroupId = searchParams.get("groupId") as Id<"groups"> | null;
  const activeGroupId =
    urlGroupId || groupStatus.activeGroupId || groupStatus.groups[0]?.groupId;
  const activeGroup = groupStatus.groups.find(
    (g) => g.groupId === activeGroupId,
  );

  if (!activeGroup) {
    return null;
  }

  return <InvitationCard groupId={activeGroup.groupId} />;
}
