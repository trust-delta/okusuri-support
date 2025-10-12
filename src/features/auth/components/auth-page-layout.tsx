import type { ReactNode } from "react";

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
      <div className="w-full max-w-md space-y-8 p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>

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
      </div>
    </div>
  );
}
