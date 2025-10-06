"use client";

import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";

export default function OnboardingPage() {
  const router = useRouter();
  const completeOnboarding = useMutation(
    api.groups.completeOnboardingWithNewGroup,
  );

  const [userName, setUserName] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [role, setRole] = useState<"patient" | "supporter">("patient");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    try {
      await completeOnboarding({
        userName,
        groupName,
        groupDescription: groupDescription || undefined,
        role,
      });

      router.push("/dashboard");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "エラーが発生しました。もう一度お試しください。",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            初期設定
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            お薬サポートを始めましょう
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div className="mb-4">
              <label
                htmlFor="userName"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                お名前
              </label>
              <input
                id="userName"
                name="userName"
                type="text"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="山田 太郎"
              />
            </div>

            <div className="mb-4">
              <label
                htmlFor="groupName"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                グループ名
              </label>
              <input
                id="groupName"
                name="groupName"
                type="text"
                required
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="山田家"
              />
            </div>

            <div className="mb-4">
              <label
                htmlFor="groupDescription"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                グループの説明（任意）
              </label>
              <textarea
                id="groupDescription"
                name="groupDescription"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="家族でお薬を管理するグループです"
                rows={3}
              />
            </div>

            <div className="mb-4">
              <p className="block text-sm font-medium text-gray-700 mb-2">
                あなたの役割
              </p>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="role"
                    value="patient"
                    checked={role === "patient"}
                    onChange={(e) => setRole(e.target.value as "patient")}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">服薬する人</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="role"
                    value="supporter"
                    checked={role === "supporter"}
                    onChange={(e) => setRole(e.target.value as "supporter")}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    サポートする人
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "設定中..." : "設定を完了する"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
