"use client";

import { Settings } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface DashboardHeaderProps {
  currentUser: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    displayName?: string;
  } | null;
}

export function DashboardHeader({ currentUser }: DashboardHeaderProps) {
  return (
    <div className="flex justify-between items-center">
      <div className="flex items-center space-x-3">
        {currentUser && (
          <Avatar className="h-12 w-12">
            <AvatarImage
              src={currentUser.image || undefined}
              alt={currentUser.name || "プロフィール画像"}
            />
            <AvatarFallback>
              {currentUser.name?.charAt(0) ||
                currentUser.email?.charAt(0) ||
                "?"}
            </AvatarFallback>
          </Avatar>
        )}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            ダッシュボード
          </h1>
          {currentUser?.displayName && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              ようこそ、{currentUser.displayName}さん
            </p>
          )}
        </div>
      </div>
      <Link href="/settings">
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
          <span className="sr-only">設定</span>
        </Button>
      </Link>
    </div>
  );
}
