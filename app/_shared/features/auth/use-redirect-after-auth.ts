"use client";

import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "@/api";

/**
 * 認証後のリダイレクトを管理するフック
 *
 * ユーザーの認証状態とグループ所属状態に応じて適切なページにリダイレクトします：
 * - 未認証 → /login
 * - グループなし → /onboarding
 * - グループあり → 現在のページに留まる
 *
 * @example
 * ```tsx
 * function DashboardPage() {
 *   const { isLoading, groupStatus } = useRedirectAfterAuth();
 *
 *   if (isLoading) {
 *     return <Spinner />;
 *   }
 *
 *   if (!groupStatus?.hasGroup) {
 *     return null; // リダイレクト中
 *   }
 *
 *   return <Dashboard />;
 * }
 * ```
 */
export function useRedirectAfterAuth() {
  const router = useRouter();
  const groupStatus = useQuery(api.groups.getUserGroupStatus);

  useEffect(() => {
    // groupStatus が undefined の場合は読み込み中なので何もしない
    if (groupStatus === undefined) {
      return;
    }

    // groupStatus が null の場合は認証されていないのでログインページへ
    if (groupStatus === null) {
      router.push("/login");
      return;
    }

    // hasGroup が false の場合のみオンボーディングへリダイレクト
    if (!groupStatus.hasGroup) {
      router.push("/onboarding");
    }
  }, [groupStatus, router]);

  return {
    isLoading: groupStatus === undefined,
    groupStatus,
  };
}
