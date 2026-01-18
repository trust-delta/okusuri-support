"use client";

import { useQuery } from "convex/react";
import { api } from "@/api";
import type { Id } from "@/schema";

export function useGroupMembers(groupId: Id<"groups">) {
  // バックエンドでソート済みのメンバーリストを取得
  const members = useQuery(api.groups.getGroupMembers, { groupId });

  return {
    members: members ?? [],
    isLoading: members === undefined,
  };
}
