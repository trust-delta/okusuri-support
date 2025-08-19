'use client'

import React, { useState } from 'react'

export default function InteractiveButton() {
  const [count, setCount] = useState(0)
  const [message, setMessage] = useState('')

  const handleClick = () => {
    setCount((prev) => prev + 1)
    setMessage(`ボタンが${count + 1}回クリックされました`)
  }

  return (
    <div className="bg-green-50 p-4 rounded-lg">
      <h2 className="text-lg font-semibold text-green-900 mb-2">Client Component</h2>
      <button
        type="button"
        onClick={handleClick}
        className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded mb-3 transition-colors"
      >
        クリック: {count}
      </button>
      {message && <p className="text-green-700">{message}</p>}
      <p className="text-sm text-green-600 mt-1">
        このコンテンツはクライアントサイドでハイドレーションされています
      </p>
    </div>
  )
}