/**
 * Middleware認証ヘルパー
 * Next.js 15 middleware用の認証チェック機能
 */

import type { NextResponse } from 'next/server'

/**
 * 保護が必要なルート定義
 */
export interface ProtectedRoute {
  /** ルートパス */
  path: string
  /** パターンマッチ用の正規表現 */
  pattern?: RegExp
  /** 必要な認証レベル */
  requiredAuth: 'authenticated' | 'admin'
}

/**
 * 認証チェック結果
 */
export interface AuthCheckResult {
  /** 認証済みかどうか */
  isAuthenticated: boolean
  /** ユーザーID（認証済みの場合） */
  userId?: string
  /** ユーザーロール */
  userRole?: 'patient' | 'supporter' | 'admin'
  /** リダイレクトが必要かどうか */
  needsRedirect: boolean
  /** リダイレクト先URL */
  redirectUrl?: string
}

/**
 * Middlewareレスポンス型
 */
export type MiddlewareResult = NextResponse | Response | null | undefined

/**
 * 保護されたルート一覧
 * ログインが必要なページを定義
 */
export const PROTECTED_ROUTES: ProtectedRoute[] = [
  // ダッシュボード
  { path: '/dashboard', requiredAuth: 'authenticated' },
  { path: '/dashboard/', requiredAuth: 'authenticated', pattern: /^\/dashboard\// },

  // プロファイル関連
  { path: '/profile', requiredAuth: 'authenticated' },
  { path: '/profile/', requiredAuth: 'authenticated', pattern: /^\/profile\// },

  // ペア管理
  { path: '/pairs', requiredAuth: 'authenticated' },
  { path: '/pairs/', requiredAuth: 'authenticated', pattern: /^\/pairs\// },

  // 服薬記録
  { path: '/medications', requiredAuth: 'authenticated' },
  { path: '/medications/', requiredAuth: 'authenticated', pattern: /^\/medications\// },

  // 管理者ページ
  { path: '/admin', requiredAuth: 'admin' },
  { path: '/admin/', requiredAuth: 'admin', pattern: /^\/admin\// },
]

/**
 * 認証が不要なルート
 * ログイン状態でアクセスすると自動でダッシュボードにリダイレクト
 */
export const PUBLIC_ROUTES = [
  '/auth/signin',
  '/auth/signup',
  '/auth/reset-password',
  '/auth/confirm-email',
  '/',
]

/**
 * APIルート（Middlewareの対象外）
 */
export const API_ROUTES_PATTERN = /^\/api\//

/**
 * 静的ファイル（Middlewareの対象外）
 */
export const STATIC_ROUTES_PATTERN =
  /^\/_next\/|^\/favicon\.ico$|^\/.*\.(png|jpg|jpeg|gif|svg|css|js|woff|woff2)$/

/**
 * パスが保護されたルートかどうかを判定
 */
export function isProtectedRoute(path: string): ProtectedRoute | null {
  for (const route of PROTECTED_ROUTES) {
    if (route.pattern?.test(path)) {
      return route
    }
    if (route.path === path) {
      return route
    }
  }
  return null
}

/**
 * パスが公開ルートかどうかを判定
 */
export function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.includes(path)
}

/**
 * パスがMiddlewareの対象かどうかを判定
 */
export function shouldProcessInMiddleware(path: string): boolean {
  // APIルートと静的ファイルはスキップ
  if (API_ROUTES_PATTERN.test(path) || STATIC_ROUTES_PATTERN.test(path)) {
    return false
  }
  return true
}

/**
 * 認証後のデフォルトリダイレクト先
 */
export function getDefaultRedirectUrl(): string {
  return '/dashboard'
}

/**
 * ログイン画面のURL
 */
export function getLoginUrl(returnTo?: string): string {
  const baseUrl = '/auth/signin'
  if (returnTo) {
    const searchParams = new URLSearchParams({ returnTo })
    return `${baseUrl}?${searchParams.toString()}`
  }
  return baseUrl
}

/**
 * パスが動的ルート（Next.js動的セグメント）かどうかを判定
 * 例: /dashboard/[id]、/profile/[...slug]
 */
export function isDynamicRoute(path: string): boolean {
  return /\[.*\]/.test(path)
}

/**
 * リダイレクト無限ループを防止するためのチェック
 */
export function wouldCauseRedirectLoop(currentPath: string, targetPath: string): boolean {
  return currentPath === targetPath
}

/**
 * URLから returnTo パラメータを安全に取得
 */
export function getReturnToFromUrl(url: URL): string | null {
  const returnTo = url.searchParams.get('returnTo')

  // セキュリティ: 外部URLへのリダイレクトを防止
  if (
    returnTo &&
    (returnTo.startsWith('http://') || returnTo.startsWith('https://') || returnTo.startsWith('//'))
  ) {
    return null
  }

  return returnTo
}
