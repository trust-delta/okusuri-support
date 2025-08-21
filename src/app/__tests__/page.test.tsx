import HomePage from '@/app/page'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it } from 'vitest'

// 型安全なテストヘルパー
const renderHomePage = () => render(<HomePage />)

describe('HomePage', () => {
  it('should render the title correctly', () => {
    renderHomePage()

    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent('お薬サポートアプリ')
  })

  it('should render the description correctly', () => {
    renderHomePage()

    const description = screen.getByText('Next.js 15 + React 19基本セットアップが完了しました。')
    expect(description).toBeInTheDocument()
  })

  it('should have a main element', () => {
    renderHomePage()

    const mainElement = screen.getByRole('main')
    expect(mainElement).toBeInTheDocument()
  })
})
