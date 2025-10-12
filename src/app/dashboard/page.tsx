"use client";

import { useQuery } from "convex/react";
import { Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GroupMembersList } from "@/features/group";
import { MedicationRecorder } from "@/features/medication";
import { api } from "../../../convex/_generated/api";
export default function DashboardPage() {
  const router = useRouter();

  const groupStatus = useQuery(api.groups.getUserGroupStatus);
  const currentUser = useQuery(api.groups.getCurrentUser);

  useEffect(() => {
    // groupStatusがundefinedの場合は読み込み中なので何もしない
    if (groupStatus === undefined) {
      return;
    }

    // groupStatusがnullの場合は認証されていないのでログインページへ
    if (groupStatus === null) {
      router.push("/login");
      return;
    }

    // hasGroupがfalseの場合のみオンボーディングへリダイレクト
    if (!groupStatus.hasGroup) {
      router.push("/onboarding");
    }
  }, [groupStatus, router]);

  if (!groupStatus) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
              <Skeleton className="h-9 w-9" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-6 w-32" />
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!groupStatus.hasGroup) {
    return null;
  }

  const firstGroup = groupStatus.groups[0];

  if (!firstGroup) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-900 dark:text-gray-100">
          グループ情報の取得に失敗しました
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              {currentUser && (
                <Avatar className="h-12 w-12">
                  <AvatarImage
                    src={currentUser.image || undefined}
                    alt={currentUser.name || "プロフィール画像"}
                  />
                  <AvatarFallback>
                    {currentUser.name?.charAt(0) ||
                      currentUser.email?.charAt(0) ||
                      "?"}
                  </AvatarFallback>
                </Avatar>
              )}
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  ダッシュボード
                </h1>
                {currentUser?.displayName && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    ようこそ、{currentUser.displayName}さん
                  </p>
                )}
              </div>
            </div>
            <Link href="/dashboard/settings">
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
                <span className="sr-only">設定</span>
              </Button>
            </Link>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <p className="text-gray-700 dark:text-gray-300">
            グループ: {firstGroup.groupName || "未設定"}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            役割: {firstGroup.role === "patient" ? "服薬者" : "サポーター"}
          </p>
        </div>

        <div className="mt-6">
          <GroupMembersList groupId={firstGroup.groupId} />
        </div>

        <div className="mt-6">
          <MedicationRecorder groupId={firstGroup.groupId} />
        </div>
      </div>
    </div>
  );
}
