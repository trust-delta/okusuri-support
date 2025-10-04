"use client";

import { useUser } from "@auth0/nextjs-auth0";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../../../../convex/_generated/api";

export default function CallbackPage() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  const createUser = useMutation(api.users.createUser);
  const onboardingStatus = useQuery(
    api.users.getOnboardingStatus,
    user?.sub && !isCreatingUser ? { auth0Id: user.sub } : "skip",
  );

  useEffect(() => {
    async function handleCallback() {
      if (isLoading || !user?.sub) return;

      // ユーザーが存在しない場合は作成
      if (onboardingStatus?.reason === "user_not_found") {
        setIsCreatingUser(true);
        try {
          await createUser({
            auth0Id: user.sub,
            email: user.email || "",
            name: user.name || user.email || "",
          });
          // ユーザー作成後、オンボーディングにリダイレクト
          router.push("/onboarding");
        } catch (error) {
          console.error("ユーザー作成エラー:", error);
        }
        return;
      }

      // オンボーディングステータスに応じてリダイレクト
      if (onboardingStatus) {
        if (onboardingStatus.isOnboarded) {
          router.push("/dashboard");
        } else {
          router.push("/onboarding");
        }
      }
    }

    handleCallback();
  }, [user, isLoading, onboardingStatus, router, createUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">ログイン処理中...</p>
      </div>
    </div>
  );
}
