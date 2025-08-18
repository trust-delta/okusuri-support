import React from 'react'
import { InteractiveButton, ServerInfo } from './components'

export default function HomePage() {
  const timestamp = new Date().toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">お薬サポートアプリ</h1>
        <p className="text-lg text-gray-600 mb-8">
          Next.js 15 + React 19基本セットアップが完了しました。
        </p>

        <ServerInfo timestamp={timestamp} />
        <InteractiveButton />
      </div>
    </main>
  )
}
