"use client";

import { History, Home, Menu, Package, Pill } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
}

/**
 * モバイル用ボトムナビゲーション
 * 主要な4項目 + その他メニューを表示
 */
export function BottomNavigation({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const groupId = searchParams.get("groupId");
  const groupIdParam = groupId ? `?groupId=${groupId}` : "";

  const navItems: NavItem[] = [
    { icon: Home, label: "ホーム", href: `/dashboard${groupIdParam}` },
    { icon: History, label: "履歴", href: `/history${groupIdParam}` },
    { icon: Pill, label: "処方箋", href: `/prescriptions${groupIdParam}` },
    { icon: Package, label: "残量", href: `/inventory${groupIdParam}` },
  ];

  const isActive = (href: string) => {
    const path = href.split("?")[0];
    return pathname === path;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full gap-1 text-xs transition-colors",
              isActive(item.href)
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        ))}
        <button
          type="button"
          onClick={onMenuClick}
          className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Menu className="h-5 w-5" />
          <span>その他</span>
        </button>
      </div>
    </nav>
  );
}
