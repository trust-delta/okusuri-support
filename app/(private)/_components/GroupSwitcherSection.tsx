"use client";

import type { Preloaded } from "convex/react";
import { usePreloadedQuery } from "convex/react";
import type { api } from "@/api";
import { GroupSwitcher } from "@/features/group";

interface GroupSwitcherSectionProps {
  preloadedGroupStatus: Preloaded<typeof api.groups.getUserGroupStatus>;
}

export function GroupSwitcherSection({
  preloadedGroupStatus,
}: GroupSwitcherSectionProps) {
  const groupStatus = usePreloadedQuery(preloadedGroupStatus);

  if (!groupStatus?.hasGroup) {
    return null;
  }

  return (
    <div className="flex justify-end">
      <GroupSwitcher
        groups={groupStatus.groups}
        activeGroupId={groupStatus.activeGroupId}
      />
    </div>
  );
}
