"use client";

import { type Preloaded, useMutation, usePreloadedQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  preloadedGroupDetails: Preloaded<typeof api.groups.getGroupDetails>;
};

export function DangerZoneCard({ preloadedGroupDetails }: Props) {
  const groupDetails = usePreloadedQuery(preloadedGroupDetails);
  const leaveGroup = useMutation(api.groups.leaveGroup);
  const deleteGroup = useMutation(api.groups.deleteGroup);

  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // グループ詳細が取得できない場合は何も表示しない（ページ側でリダイレクトされる）
  if (!groupDetails) {
    return null;
  }

  const handleLeaveGroup = async () => {
    setIsLoading(true);
    try {
      const result = await leaveGroup({ groupId: groupDetails._id });

      if (result.isSuccess) {
        // ダイアログは閉じずに遷移（エラー表示を防ぐ）
        toast.success("グループから脱退しました");
        // 設定ページをリロードしてサーバーサイドで適切にリダイレクト
        window.location.href = "/group/settings";
        // 遷移後の処理は実行されない
        return;
      }

      toast.error(result.errorMessage);
      setIsLoading(false);
      setIsLeaveDialogOpen(false);
    } catch (error) {
      toast.error("脱退に失敗しました");
      console.error(error);
      setIsLoading(false);
      setIsLeaveDialogOpen(false);
    }
  };

  const handleDeleteGroup = async () => {
    setIsLoading(true);
    try {
      const result = await deleteGroup({ groupId: groupDetails._id });

      if (result.isSuccess) {
        // ダイアログは閉じずに遷移（エラー表示を防ぐ）
        toast.success("グループを削除しました");
        // 設定ページをリロードしてサーバーサイドで適切にリダイレクト
        window.location.href = "/group/settings";
        // 遷移後の処理は実行されない
        return;
      }

      toast.error(result.errorMessage);
      setIsLoading(false);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      toast.error("削除に失敗しました");
      console.error(error);
      setIsLoading(false);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <>
      <Card className="border-red-200 dark:border-red-900">
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400">
            危険な操作
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 脱退ボタン（2人以上の場合のみ表示） */}
          {!groupDetails.isLastMember && (
            <div className="flex items-center justify-between p-4 rounded-lg border border-red-200 dark:border-red-900">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">
                  グループから脱退
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  このグループから脱退します。再度招待されることで、以前のデータを保持したまま再参加できます。
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => setIsLeaveDialogOpen(true)}
                disabled={isLoading}
              >
                脱退する
              </Button>
            </div>
          )}

          {/* 削除ボタン（最後の1人の場合のみ表示） */}
          {groupDetails.isLastMember && (
            <div className="flex items-center justify-between p-4 rounded-lg border border-red-200 dark:border-red-900">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">
                  グループを削除
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  このグループに関連する全てのデータ（処方箋、服薬記録など）が削除されます。この操作は元に戻すことができません。
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => setIsDeleteDialogOpen(true)}
                disabled={isLoading}
              >
                削除する
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 脱退確認ダイアログ */}
      <AlertDialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>グループから脱退しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              脱退後も、再度招待されることで以前のデータを保持したまま再参加できます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveGroup}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? "脱退中..." : "脱退する"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 削除確認ダイアログ */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>グループを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              このグループに関連する全てのデータ（処方箋、服薬記録など）が削除されます。
              <br />
              この操作は元に戻すことができません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGroup}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? "削除中..." : "削除する"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
