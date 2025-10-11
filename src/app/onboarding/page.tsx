"use client";

import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "../../../convex/_generated/api";

export default function OnboardingPage() {
  const router = useRouter();
  const completeOnboarding = useMutation(
    api.groups.completeOnboardingWithNewGroup,
  );

  const [mode, setMode] = useState<"select" | "create" | "join">("select");
  const [userName, setUserName] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [role, setRole] = useState<"patient" | "supporter">("patient");
  const [invitationCode, setInvitationCode] = useState("");
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

  // モード選択画面
  if (mode === "select") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">
              初期設定
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
              お薬サポートを始めましょう
            </p>
          </div>

          <div className="space-y-4">
            <Button
              onClick={() => setMode("create")}
              className="w-full h-auto py-6 flex flex-col items-center gap-2"
              variant="default"
            >
              <span className="text-lg font-semibold">新しいグループを作成</span>
              <span className="text-sm font-normal opacity-90">
                家族やケアチームのグループを作ります
              </span>
            </Button>

            <Button
              onClick={() => setMode("join")}
              className="w-full h-auto py-6 flex flex-col items-center gap-2"
              variant="outline"
            >
              <span className="text-lg font-semibold">招待コードで参加</span>
              <span className="text-sm font-normal">
                既存のグループに参加します
              </span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 招待コードで参加モード
  if (mode === "join") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">
              招待コードで参加
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
              グループ管理者から受け取った招待コードを入力してください
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="invitationCode"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                招待コード
              </label>
              <Input
                id="invitationCode"
                name="invitationCode"
                type="text"
                value={invitationCode}
                onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                placeholder="ABCD1234"
                maxLength={8}
                className="text-center text-lg font-mono tracking-wider"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                8文字の英数字コード
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => setMode("select")}
                variant="outline"
                className="flex-1"
              >
                戻る
              </Button>
              <Button
                onClick={() => {
                  if (invitationCode.length === 8) {
                    router.push(`/invite/${invitationCode}`);
                  } else {
                    toast.error("招待コードは8文字です");
                  }
                }}
                disabled={invitationCode.length !== 8}
                className="flex-1"
              >
                次へ
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 新規グループ作成モード（既存のフォーム）
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">
            新しいグループを作成
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            グループ情報を入力してください
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div className="mb-4">
              <label
                htmlFor="userName"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                お名前
              </label>
              <Input
                id="userName"
                name="userName"
                type="text"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="山田 太郎"
              />
            </div>

            <div className="mb-4">
              <label
                htmlFor="groupName"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                グループ名
              </label>
              <Input
                id="groupName"
                name="groupName"
                type="text"
                required
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="山田家"
              />
            </div>

            <div className="mb-4">
              <label
                htmlFor="groupDescription"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                グループの説明（任意）
              </label>
              <textarea
                id="groupDescription"
                name="groupDescription"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="家族でお薬を管理するグループです"
                rows={3}
              />
            </div>

            <div className="mb-4">
              <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">服薬する人</span>
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
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    サポートする人
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => setMode("select")}
              variant="outline"
              className="flex-1"
            >
              戻る
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? "設定中..." : "設定を完了する"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
