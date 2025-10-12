import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AuthPageLayoutProps {
  title: string;
  description?: string;
  children: ReactNode;
  showBackLink?: boolean;
  backLinkHref?: string;
  backLinkText?: string;
}

/**
 * 認証・オンボーディング系ページの共通レイアウトコンポーネント
 *
 * @example
 * ```tsx
 * <AuthPageLayout
 *   title="ログイン"
 *   description="お薬サポートにログインしてください"
 *   showBackLink
 * >
 *   <LoginForm />
 * </AuthPageLayout>
 * ```
 */
export function AuthPageLayout({
  title,
  description,
  children,
  showBackLink = false,
  backLinkHref = "/",
  backLinkText = "← トップページに戻る",
}: AuthPageLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>

        <CardContent>
          {children}

          {showBackLink && (
            <div className="mt-6 text-center">
              <a
                href={backLinkHref}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors"
              >
                {backLinkText}
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
