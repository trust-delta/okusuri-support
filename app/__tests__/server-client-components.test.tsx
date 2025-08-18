import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it } from 'vitest'
import { InteractiveButton, ServerInfo } from '../components'

describe('Server/Client Component Integration', () => {
  it('should render ServerInfo component with timestamp', () => {
    const timestamp = '2025-08-18 21:00:00'
    render(<ServerInfo timestamp={timestamp} />)

    expect(screen.getByText('Server Component')).toBeDefined()
    expect(screen.getByText('サーバーサイドで生成された時刻: 2025-08-18 21:00:00')).toBeDefined()
  })

  it('should render InteractiveButton component and handle clicks', () => {
    render(<InteractiveButton />)

    expect(screen.getByText('Client Component')).toBeDefined()

    const button = screen.getByRole('button', { name: /クリック: 0/ })
    expect(button).toBeDefined()

    fireEvent.click(button)
    expect(screen.getByText('ボタンが1回クリックされました')).toBeDefined()
  })
})
