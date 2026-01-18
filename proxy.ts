/**
 * Next.js 16 Proxy（旧 Middleware）
 *
 * Convex Auth を使用した認証・ルート保護を行う。
 * Next.js 16 で middleware.ts から proxy.ts に名称変更。
 */
import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isSignInPage = createRouteMatcher(["/login"]);

// (private) ルートグループ内のすべてのページを保護
// 注: /invite/(.*)は招待コード検証のために認証不要（.context/specs/features/group.md参照）
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/onboarding(.*)",
  "/prescriptions(.*)",
  "/history(.*)",
  "/group(.*)",
  "/statistics(.*)",
  "/settings(.*)",
]);

/**
 * Proxy 関数（Next.js 16 で推奨される名前付きエクスポート）
 */
export const proxy = convexAuthNextjsMiddleware(
  async (request, { convexAuth }) => {
    if (isSignInPage(request) && (await convexAuth.isAuthenticated())) {
      return nextjsMiddlewareRedirect(request, "/dashboard");
    }
    if (isProtectedRoute(request) && !(await convexAuth.isAuthenticated())) {
      return nextjsMiddlewareRedirect(request, "/login");
    }
  },
  { cookieConfig: { maxAge: 60 * 60 * 24 * 30 } },
);

export const config = {
  // 静的アセット以外のすべてのルートに適用
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
