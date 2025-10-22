"use client";

import { useQuery } from "convex/react";
import { useMemo } from "react";
import type { Id } from "@/lib/convex";
import { api } from "@/lib/convex";

export function useGroupMembers(groupId: Id<"groups">) {
  const members = useQuery(api.groups.getGroupMembers, { groupId });

  const sortedMembers = useMemo(() => {
    if (!members) return [];

    return [...members].sort((a, b) => {
      // 患者を先頭に
      if (a.role === "patient" && b.role !== "patient") return -1;
      if (a.role !== "patient" && b.role === "patient") return 1;
      // 同じロールなら参加日時順
      return a.joinedAt - b.joinedAt;
    });
  }, [members]);

  return {
    members: sortedMembers,
    isLoading: members === undefined,
  };
}
