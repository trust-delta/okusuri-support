"use client";

import { useQuery } from "convex/react";
import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Id } from "@/schema";
import { PrescriptionList } from "./_components";
import { DeletedPrescriptionList } from "./_components/DeletedPrescriptionList";
import { PrescriptionFormWithMedicines } from "./_components/PrescriptionFormWithMedicines";

export default function PrescriptionsPage() {
  const searchParams = useSearchParams();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // グループステータスを取得
  const groupStatus = useQuery(api.groups.getUserGroupStatus, {});

  // URLパラメータからgroupIdを取得、なければDBのactiveGroupIdまたは最初のグループ
  const urlGroupId = searchParams.get("groupId") as Id<"groups"> | null;
  const activeGroupId =
    urlGroupId || groupStatus?.activeGroupId || groupStatus?.groups[0]?.groupId;

  if (!activeGroupId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-gray-500 dark:text-gray-400">
            グループ情報を読み込んでいます...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center gap-4">
          <Link
            href={`/dashboard${activeGroupId ? `?groupId=${activeGroupId}` : ""}`}
          >
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">ダッシュボードに戻る</span>
            </Button>
          </Link>
        </div>

        {/* タイトルと説明 */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">処方箋管理</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              処方箋を登録して、薬の有効期間を管理できます
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            処方箋を登録
          </Button>
        </div>

        {/* タブで処方箋を切り替え */}
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="active">有効な処方箋</TabsTrigger>
            <TabsTrigger value="inactive">無効な処方箋</TabsTrigger>
            <TabsTrigger value="deleted">ゴミ箱</TabsTrigger>
          </TabsList>
          <TabsContent value="active" className="mt-6">
            <PrescriptionList groupId={activeGroupId} filter="active" />
          </TabsContent>
          <TabsContent value="inactive" className="mt-6">
            <PrescriptionList groupId={activeGroupId} filter="inactive" />
          </TabsContent>
          <TabsContent value="deleted" className="mt-6">
            <DeletedPrescriptionList groupId={activeGroupId} />
          </TabsContent>
        </Tabs>

        {/* 処方箋作成ダイアログ */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>処方箋を登録</DialogTitle>
              <DialogDescription>
                処方箋の情報と薬を入力してください
              </DialogDescription>
            </DialogHeader>
            <PrescriptionFormWithMedicines
              groupId={activeGroupId}
              onSuccess={() => setIsCreateDialogOpen(false)}
              onCancel={() => setIsCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
