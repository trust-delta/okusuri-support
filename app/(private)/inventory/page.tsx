import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { preloadedQueryResult, preloadQuery } from "convex/nextjs";
import { redirect } from "next/navigation";
import { api } from "@/api";
import { InventoryPageClient } from "./_components/InventoryPageClient";

export const metadata = {
  title: "残量管理 | おくすりサポート",
  description: "薬の残量を管理",
};

export default async function InventoryPage() {
  const token = await convexAuthNextjsToken();
  const groupStatus = await preloadQuery(
    api.groups.getUserGroupStatus,
    {},
    { token },
  );

  // 認証されていない場合はログインページへ
  if (groupStatus === null) {
    redirect("/login");
  }

  const groupStatusResult = preloadedQueryResult(groupStatus);

  // groupStatusResultがnullの場合はログインページへ
  if (!groupStatusResult) {
    redirect("/login");
  }

  // グループに参加していない場合はオンボーディングへ
  if (!groupStatusResult.hasGroup) {
    redirect("/onboarding");
  }

  // アクティブグループを取得
  const activeGroupId =
    groupStatusResult.activeGroupId || groupStatusResult.groups[0]?.groupId;

  if (!activeGroupId) {
    redirect("/onboarding");
  }

  // データをプリロード
  const preloadedInventories = await preloadQuery(
    api.medications.getInventoriesByGroup,
    { groupId: activeGroupId, trackingOnly: false },
    { token },
  );

  const preloadedAlerts = await preloadQuery(
    api.medications.getUnreadAlerts,
    { groupId: activeGroupId },
    { token },
  );

  const preloadedMedicines = await preloadQuery(
    api.medications.getGroupMedicines,
    { groupId: activeGroupId },
    { token },
  );

  return (
    <InventoryPageClient
      groupId={activeGroupId}
      preloadedInventories={preloadedInventories}
      preloadedAlerts={preloadedAlerts}
      preloadedMedicines={preloadedMedicines}
    />
  );
}
