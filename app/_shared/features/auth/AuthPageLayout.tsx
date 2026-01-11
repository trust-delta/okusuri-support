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
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        {/* ロゴエリア */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-2">
            <span className="text-3xl">💊</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            おくすりサポート
          </h1>
        </div>

        <Card className="w-full">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">{title}</CardTitle>
            {description && (
              <CardDescription className="text-muted-foreground">
                {description}
              </CardDescription>
            )}
          </CardHeader>

          <CardContent>
            {children}

            {showBackLink && (
              <div className="mt-6 text-center">
                <a
                  href={backLinkHref}
                  className="text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  {backLinkText}
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
