"use client";

import {
  BarChart3,
  History,
  Home,
  Package,
  Pill,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

/**
 * ヘッダーのナビゲーションボタン（Client Component）
 *
 * URLパラメータからgroupIdを読み取り、ナビゲーションリンクに含める
 */
export function HeaderNavigation() {
  const searchParams = useSearchParams();
  const groupId = searchParams.get("groupId");
  const groupIdParam = groupId ? `?groupId=${groupId}` : "";

  return (
    <div className="flex items-center gap-2">
      <Link href={`/dashboard${groupIdParam}`}>
        <Button variant="ghost" size="icon">
          <Home className="h-5 w-5" />
          <span className="sr-only">ダッシュボード</span>
        </Button>
      </Link>
      <Link href={`/history${groupIdParam}`}>
        <Button variant="ghost" size="icon">
          <History className="h-5 w-5" />
          <span className="sr-only">記録履歴</span>
        </Button>
      </Link>
      <Link href={`/statistics${groupIdParam}`}>
        <Button variant="ghost" size="icon">
          <BarChart3 className="h-5 w-5" />
          <span className="sr-only">統計</span>
        </Button>
      </Link>
      <Link href={`/prescriptions${groupIdParam}`}>
        <Button variant="ghost" size="icon">
          <Pill className="h-5 w-5" />
          <span className="sr-only">処方箋管理</span>
        </Button>
      </Link>
      <Link href={`/inventory${groupIdParam}`}>
        <Button variant="ghost" size="icon">
          <Package className="h-5 w-5" />
          <span className="sr-only">残量管理</span>
        </Button>
      </Link>
      <Link href={`/group${groupIdParam}`}>
        <Button variant="ghost" size="icon">
          <Users className="h-5 w-5" />
          <span className="sr-only">グループ</span>
        </Button>
      </Link>
      <Link href={`/settings${groupIdParam}`}>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
          <span className="sr-only">設定</span>
        </Button>
      </Link>
    </div>
  );
}
