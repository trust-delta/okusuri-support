"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { MedicationRecorder } from "@/components/medication-recorder";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export default function DashboardPage() {
  const router = useRouter();
  const { signOut } = useAuthActions();

  const groupStatus = useQuery(api.groups.getUserGroupStatus);

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  if (!groupStatus.hasGroup) {
    return null;
  }

  const firstGroup = groupStatus.groups[0];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">ダッシュボード</h1>
        </div>
        <button type="button" onClick={() => void signOut()}>
          Sign Out
        </button>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-700">
            グループ: {firstGroup?.groupName || "未設定"}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            役割: {firstGroup?.role === "patient" ? "服薬者" : "サポーター"}
          </p>
        </div>

        {firstGroup && (
          <div className="mt-6">
            <MedicationRecorder groupId={firstGroup.groupId as Id<"groups">} />
          </div>
        )}
      </div>
    </div>
  );
}
