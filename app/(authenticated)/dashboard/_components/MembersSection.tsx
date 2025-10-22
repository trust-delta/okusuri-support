"use client";

import type { Preloaded } from "convex/react";
import { usePreloadedQuery } from "convex/react";
import { GroupMembersList } from "@/features/group";
import type { api } from "@/lib/convex";

interface MembersSectionProps {
  preloadedGroupMembers: Preloaded<typeof api.groups.getGroupMembers>;
}

export function MembersSection({ preloadedGroupMembers }: MembersSectionProps) {
  const groupMembers = usePreloadedQuery(preloadedGroupMembers);

  return <GroupMembersList members={groupMembers} />;
}
