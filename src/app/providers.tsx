'use client'

import { AuthProvider } from '@/features/auth/components/providers/AuthProvider'
import { PairProvider } from '@/features/pairs/components/providers/PairProvider'
import { ThemeProvider } from 'next-themes'
import type React from 'react'

/**
 * Providers統合Props型定義
 */
interface ProvidersProps {
  children: React.ReactNode
}

/**
 * 全Provider統合コンポーネント
 *
 * Provider順序の理由:
 * 1. ThemeProvider: 最外層でテーマ設定（SSR対応）
 * 2. AuthProvider: 認証状態管理（ペア機能の前提）
 * 3. PairProvider: ペア状態管理（認証状態に依存）
 *
 * SSR対応:
 * - ThemeProviderのsuppressHydrationWarning対応済み
 * - Client Componentとしてマーク
 * - Supabaseクライアントの初期化は各Providerで処理
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AuthProvider>
        <PairProvider>{children}</PairProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
