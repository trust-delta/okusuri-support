import type { Metadata } from 'next'
import React from 'react'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'お薬サポートアプリ',
  description: '服薬記録と支援のためのアプリケーション',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
