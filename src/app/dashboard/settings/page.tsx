"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { api } from "../../../../convex/_generated/api";

export default function SettingsPage() {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const currentUser = useQuery(api.groups.getCurrentUser);
  const updateDisplayName = useMutation(api.groups.updateUserDisplayName);

  const [displayName, setDisplayName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 初回読み込み時に現在の表示名を設定
  useEffect(() => {
    if (currentUser?.displayName) {
      setDisplayName(currentUser.displayName);
    }
  }, [currentUser]);

  const handleSaveDisplayName = async () => {
    if (!displayName.trim()) {
      toast.error("表示名を入力してください");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateDisplayName({ displayName: displayName.trim() });
      toast.success("表示名を更新しました");
      setIsEditing(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "更新に失敗しました",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setDisplayName(currentUser?.displayName || "");
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            設定
          </h1>
          <Button variant="ghost" onClick={() => router.back()}>
            戻る
          </Button>
        </div>

        <div className="space-y-6">
          {/* プロフィール設定 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              プロフィール
            </h2>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="displayName"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  表示名
                </label>
                {isEditing ? (
                  <div className="space-y-3">
                    <Input
                      id="displayName"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="山田 太郎"
                      maxLength={50}
                      disabled={isSubmitting}
                    />
                    <div className="flex space-x-2">
                      <Button
                        onClick={handleSaveDisplayName}
                        disabled={isSubmitting}
                        size="sm"
                      >
                        {isSubmitting ? "保存中..." : "保存"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleCancel}
                        disabled={isSubmitting}
                        size="sm"
                      >
                        キャンセル
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-gray-900 dark:text-gray-100">
                      {currentUser?.displayName || "未設定"}
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(true)}
                      size="sm"
                    >
                      編集
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* テーマ設定 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              表示設定
            </h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  テーマ
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  ライト・ダーク・システム設定から選択できます
                </p>
              </div>
              <ThemeToggle />
            </div>
          </div>

          {/* アカウント設定 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              アカウント
            </h2>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void signOut()}
            >
              ログアウト
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
