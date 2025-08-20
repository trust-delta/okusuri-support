/**
 * Next.js 15 Middleware
 * 認証チェックとページアクセス制御
 */

import {
  type AuthCheckResult,
  getDefaultRedirectUrl,
  getLoginUrl,
  getReturnToFromUrl,
  isProtectedRoute,
  isPublicRoute,
  shouldProcessInMiddleware,
  wouldCauseRedirectLoop,
} from '@/lib/auth/middleware-helper'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * 認証状態をチェック
 */
async function checkAuthentication(request: NextRequest): Promise<AuthCheckResult> {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return {
        isAuthenticated: false,
        needsRedirect: false,
      }
    }

    // パフォーマンス最適化：roleのみを取得（すべてのフィールドは不要）
    const { data: userData, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !userData) {
      // ユーザーIDを含めずにログ出力（プライバシー保護）
      console.warn('ユーザープロファイル取得エラー:', {
        error: profileError?.message,
        hasUser: !!user,
        timestamp: new Date().toISOString(),
      })
      return {
        isAuthenticated: false,
        needsRedirect: false,
      }
    }

    return {
      isAuthenticated: true,
      userId: user.id,
      userRole: userData.role,
      needsRedirect: false,
    }
  } catch (error) {
    // エラー詳細をログ出力（セキュリティ情報は除外）
    console.error('認証チェックエラー:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      path: request.nextUrl.pathname,
    })
    return {
      isAuthenticated: false,
      needsRedirect: false,
    }
  }
}

/**
 * Middleware メイン処理
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // APIルートと静的ファイルはスキップ
  if (!shouldProcessInMiddleware(pathname)) {
    return NextResponse.next()
  }

  const authResult = await checkAuthentication(request)
  const protectedRoute = isProtectedRoute(pathname)
  const isPublic = isPublicRoute(pathname)

  // 保護されたルートへのアクセス
  if (protectedRoute) {
    if (!authResult.isAuthenticated) {
      // 未認証：ログイン画面にリダイレクト
      const loginUrl = getLoginUrl(pathname)
      return NextResponse.redirect(new URL(loginUrl, request.url))
    }

    // 管理者権限が必要なページの場合
    if (protectedRoute.requiredAuth === 'admin' && authResult.userRole !== 'admin') {
      // 管理者権限なし：403エラー
      return new NextResponse('Forbidden', { status: 403 })
    }

    // 認証OK：そのまま通す
    return NextResponse.next()
  }

  // 認証が必要ないページ（ログイン画面など）
  if (isPublic) {
    if (authResult.isAuthenticated) {
      // 既に認証済み：適切なページにリダイレクト
      const returnTo = getReturnToFromUrl(request.nextUrl)
      let redirectUrl = getDefaultRedirectUrl()

      // returnToが指定されており、安全な場合はそちらにリダイレクト
      if (returnTo && !wouldCauseRedirectLoop(returnTo, pathname)) {
        const protectedReturnRoute = isProtectedRoute(returnTo)
        // returnToが保護されたルートで、適切な権限がある場合のみ
        if (protectedReturnRoute) {
          if (protectedReturnRoute.requiredAuth === 'admin' && authResult.userRole !== 'admin') {
            // 管理者権限が必要だが権限がない場合はデフォルトにリダイレクト
            redirectUrl = getDefaultRedirectUrl()
          } else {
            redirectUrl = returnTo
          }
        } else {
          // 保護されていないルートまたはホーム画面
          redirectUrl = returnTo
        }
      }

      return NextResponse.redirect(new URL(redirectUrl, request.url))
    }

    // 未認証：そのまま通す
    return NextResponse.next()
  }

  // その他のページ（ホーム画面など）：そのまま通す
  return NextResponse.next()
}

/**
 * Middleware設定
 * APIルート、静的ファイル以外のすべてのパスで実行
 */
export const config = {
  matcher: [
    /*
     * 以下以外のすべてのパスにマッチ:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - 画像、CSS、JSなどの静的ファイル
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|css|js|woff|woff2)$).*)',
  ],
}
