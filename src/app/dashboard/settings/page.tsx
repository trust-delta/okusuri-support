"use client";

import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SignOutButton } from "@/features/auth";
import { GroupInvitationManager } from "@/features/group";
import { api } from "../../../../convex/_generated/api";

export default function SettingsPage() {
  const router = useRouter();
  const currentUser = useQuery(api.groups.getCurrentUser);
  const groupStatus = useQuery(api.groups.getUserGroupStatus);
  const updateDisplayName = useMutation(api.groups.updateUserDisplayName);
  const generateUploadUrl = useMutation(api.groups.generateUploadUrl);
  const updateUserImageFromStorage = useMutation(
    api.groups.updateUserImageFromStorage,
  );

  const [displayName, setDisplayName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

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

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 画像ファイルのバリデーション
    if (!file.type.startsWith("image/")) {
      toast.error("画像ファイルを選択してください");
      return;
    }

    // ファイルサイズチェック (5MB以下)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("画像サイズは5MB以下にしてください");
      return;
    }

    setIsUploadingImage(true);
    try {
      // Step 1: アップロードURLを生成
      const postUrl = await generateUploadUrl();

      // Step 2: ファイルをアップロード
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();

      // Step 3: ストレージIDを使ってプロフィール画像を更新
      await updateUserImageFromStorage({ storageId });

      toast.success("プロフィール画像を更新しました");

      // 入力をリセット
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "画像のアップロードに失敗しました",
      );
    } finally {
      setIsUploadingImage(false);
    }
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
          <Card>
            <CardHeader>
              <CardTitle>プロフィール</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* プロフィール画像 */}
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage
                    src={currentUser?.image || undefined}
                    alt={currentUser?.name || "プロフィール画像"}
                  />
                  <AvatarFallback className="text-2xl">
                    {currentUser?.name?.charAt(0) ||
                      currentUser?.email?.charAt(0) ||
                      "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    プロフィール画像
                  </p>
                  <div className="flex items-center space-x-2">
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isUploadingImage}
                      className="hidden"
                      id="profile-image-upload"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={isUploadingImage}
                    >
                      {isUploadingImage ? "アップロード中..." : "画像を変更"}
                    </Button>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      JPG, PNG (最大5MB)
                    </p>
                  </div>
                </div>
              </div>
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
            </CardContent>
          </Card>

          {/* テーマ設定 */}
          <Card>
            <CardHeader>
              <CardTitle>表示設定</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          {/* グループ招待管理 */}
          {groupStatus?.groups[0] && (
            <Card>
              <CardHeader>
                <CardTitle>グループ招待</CardTitle>
              </CardHeader>
              <CardContent>
                <GroupInvitationManager
                  groupId={groupStatus.groups[0].groupId}
                />
              </CardContent>
            </Card>
          )}

          {/* アカウント設定 */}
          <Card>
            <CardHeader>
              <CardTitle>アカウント</CardTitle>
            </CardHeader>
            <CardContent>
              <SignOutButton />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
