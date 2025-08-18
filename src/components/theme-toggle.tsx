'use client'

import React, { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { SunIcon, MoonIcon, ComputerIcon } from '@/components/icons'

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="outline" size="icon">
        <SunIcon size={16} />
      </Button>
    )
  }

  const cycleTheme = () => {
    if (theme === 'light') {
      setTheme('dark')
    } else if (theme === 'dark') {
      setTheme('system')
    } else {
      setTheme('light')
    }
  }

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <SunIcon size={16} />
      case 'dark':
        return <MoonIcon size={16} />
      default:
        return <ComputerIcon size={16} />
    }
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={cycleTheme}
      title={`現在のテーマ: ${theme === 'system' ? 'システム' : theme === 'light' ? 'ライト' : 'ダーク'}`}
      data-testid="theme-toggle"
      aria-label={`テーマを切り替え: ${theme === 'system' ? 'システム' : theme === 'light' ? 'ライト' : 'ダーク'}`}
    >
      {getThemeIcon()}
    </Button>
  )
}