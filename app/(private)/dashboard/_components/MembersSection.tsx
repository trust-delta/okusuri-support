"use client";

import type { Preloaded } from "convex/react";
import { usePreloadedQuery } from "convex/react";
import type { api } from "@/api";
import { GroupMembersList } from "@/features/group";

interface MembersSectionProps {
  preloadedGroupMembers: Preloaded<typeof api.groups.getGroupMembers>;
}

export function MembersSection({ preloadedGroupMembers }: MembersSectionProps) {
  const groupMembers = usePreloadedQuery(preloadedGroupMembers);

  return <GroupMembersList members={groupMembers} />;
}
