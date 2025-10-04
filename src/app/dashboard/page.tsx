"use client";

import { useUser } from "@auth0/nextjs-auth0";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { MedicationRecorder } from "@/components/MedicationRecorder";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useUser();
  const router = useRouter();

  const onboardingStatus = useQuery(
    api.users.getOnboardingStatus,
    user?.sub ? { auth0Id: user.sub } : "skip",
  );

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push("/auth/login");
      return;
    }

    if (onboardingStatus && !onboardingStatus.isOnboarded) {
      router.push("/onboarding");
    }
  }, [user, authLoading, onboardingStatus, router]);

  if (authLoading || !onboardingStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  if (!onboardingStatus.isOnboarded) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">ダッシュボード</h1>
          <a
            href="/auth/logout"
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            ログアウト
          </a>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-700">
            ようこそ、{user?.name || user?.email}さん
          </p>
        </div>

        {onboardingStatus.groupId && (
          <div className="mt-6">
            <MedicationRecorder
              groupId={onboardingStatus.groupId as Id<"groups">}
            />
          </div>
        )}
      </div>
    </div>
  );
}
