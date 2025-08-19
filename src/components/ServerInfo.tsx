import React from 'react'

interface ServerInfoProps {
  timestamp: string
}

export default function ServerInfo({ timestamp }: ServerInfoProps) {
  return (
    <div className="bg-blue-50 p-4 rounded-lg mb-6">
      <h2 className="text-lg font-semibold text-blue-900 mb-2">Server Component</h2>
      <p className="text-blue-700">サーバーサイドで生成された時刻: {timestamp}</p>
      <p className="text-sm text-blue-600 mt-1">
        このコンテンツはサーバーで事前レンダリングされています
      </p>
    </div>
  )
}