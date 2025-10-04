"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { MedicationRecorder } from "@/components/MedicationRecorder";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export default function DashboardPage() {
  return (
    <>
      <Authenticated>
        <DashboardContent />
      </Authenticated>
      <Unauthenticated>
        <RedirectToLogin />
      </Unauthenticated>
    </>
  );
}

function DashboardContent() {
  const { signOut } = useAuthActions();
  const router = useRouter();

  const groupStatus = useQuery(api.groups.getUserGroupStatus);

  useEffect(() => {
    if (groupStatus && !groupStatus.hasGroup) {
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
          <button
            onClick={() => void signOut()}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            ログアウト
          </button>
        </div>
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

function RedirectToLogin() {
  const router = useRouter();

  useEffect(() => {
    router.push("/");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-lg">読み込み中...</div>
    </div>
  );
}
