"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

interface InviteErrorDisplayProps {
  errorMessage: string;
}

/**
 * 招待エラー表示コンポーネント（Client Component）
 *
 * Server Componentからイベントハンドラーを使わずにエラー表示するために分離
 */
export function InviteErrorDisplay({ errorMessage }: InviteErrorDisplayProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-foreground">
            招待が無効です
          </h2>
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            {errorMessage}
          </p>
          <div className="mt-6">
            <Button asChild>
              <Link href="/dashboard">ダッシュボードに戻る</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
