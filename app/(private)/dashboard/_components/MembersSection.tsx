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

  // メンバー情報が取得できない場合は何も表示しない
  if (!groupMembers) {
    return null;
  }

  return <GroupMembersList members={groupMembers} />;
}
