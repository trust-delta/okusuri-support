"use client";

import { BarChart3, Settings, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface MobileMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MenuItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  description: string;
}

/**
 * モバイル用サイドメニュー
 * ボトムナビに入りきらない項目を表示
 */
export function MobileMenu({ open, onOpenChange }: MobileMenuProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const groupId = searchParams.get("groupId");
  const groupIdParam = groupId ? `?groupId=${groupId}` : "";

  const menuItems: MenuItem[] = [
    {
      icon: BarChart3,
      label: "統計",
      href: `/statistics${groupIdParam}`,
      description: "服薬の統計データを確認",
    },
    {
      icon: Users,
      label: "グループ",
      href: `/group${groupIdParam}`,
      description: "グループメンバーの管理",
    },
    {
      icon: Settings,
      label: "設定",
      href: `/settings${groupIdParam}`,
      description: "アプリの設定を変更",
    },
  ];

  const isActive = (href: string) => {
    const path = href.split("?")[0];
    return pathname === path;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-80">
        <SheetHeader className="text-left">
          <SheetTitle>メニュー</SheetTitle>
        </SheetHeader>
        <nav className="mt-6 space-y-2">
          {menuItems.map((item) => (
            <SheetClose asChild key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-4 rounded-lg px-4 py-3 transition-colors",
                  isActive(item.href)
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted",
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{item.label}</div>
                  <div className="text-sm text-muted-foreground truncate">
                    {item.description}
                  </div>
                </div>
              </Link>
            </SheetClose>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
