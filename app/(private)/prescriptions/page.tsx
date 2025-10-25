"use client";

import { useQuery } from "convex/react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Id } from "@/schema";
import { PrescriptionList } from "./_components";
import { DeletedPrescriptionList } from "./_components/DeletedPrescriptionList";

export default function PrescriptionsPage() {
  const searchParams = useSearchParams();

  // グループステータスを取得
  const groupStatus = useQuery(api.groups.getUserGroupStatus, {});

  // URLパラメータからgroupIdを取得、なければDBのactiveGroupIdまたは最初のグループ
  const urlGroupId = searchParams.get("groupId") as Id<"groups"> | null;
  const activeGroupId =
    urlGroupId ||
    groupStatus?.activeGroupId ||
    groupStatus?.groups[0]?.groupId;

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

        {/* タブで処方箋一覧とゴミ箱を切り替え */}
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active">有効な処方箋</TabsTrigger>
            <TabsTrigger value="deleted">ゴミ箱</TabsTrigger>
          </TabsList>
          <TabsContent value="active" className="mt-6">
            <PrescriptionList groupId={activeGroupId} />
          </TabsContent>
          <TabsContent value="deleted" className="mt-6">
            <DeletedPrescriptionList groupId={activeGroupId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
