/**
 * Provider統合テスト
 * AuthProvider、PairProvider、ThemeProviderの統合動作を確認
 */

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Providers } from '../providers'

// AuthProviderとPairProviderのモック
vi.mock('@/features/auth/components/providers/AuthProvider', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-provider">{children}</div>
  ),
  useAuthContext: () => ({
    isAuthenticated: false,
    isLoading: false,
    user: null,
    error: null,
  }),
}))

vi.mock('@/features/pairs/components/providers/PairProvider', () => ({
  PairProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pair-provider">{children}</div>
  ),
  usePairContext: () => ({
    currentPair: null,
    hasPair: false,
    isLoading: false,
    error: null,
  }),
}))

// テスト用コンポーネント
const TestComponent = () => {
  return <div data-testid="test-content">Provider統合テスト</div>
}

describe('Providers Integration', () => {
  it('should render ThemeProvider by default', () => {
    render(
      <Providers>
        <TestComponent />
      </Providers>
    )

    expect(screen.getByTestId('test-content')).toBeInTheDocument()
  })

  it('should integrate AuthProvider in the provider hierarchy', () => {
    render(
      <Providers>
        <TestComponent />
      </Providers>
    )

    // AuthProviderが統合されていることを期待（現在は失敗する）
    expect(screen.getByTestId('auth-provider')).toBeInTheDocument()
  })

  it('should integrate PairProvider in the provider hierarchy', () => {
    render(
      <Providers>
        <TestComponent />
      </Providers>
    )

    // PairProviderが統合されていることを期待（現在は失敗する）
    expect(screen.getByTestId('pair-provider')).toBeInTheDocument()
  })

  it('should maintain correct provider nesting order', () => {
    render(
      <Providers>
        <TestComponent />
      </Providers>
    )

    // Providerのネスト順序が正しいことを期待（現在は失敗する）
    const authProvider = screen.getByTestId('auth-provider')
    const pairProvider = screen.getByTestId('pair-provider')
    const testContent = screen.getByTestId('test-content')

    // AuthProvider > PairProvider > TestContentの順序でネストされていることを確認
    expect(authProvider).toContainElement(pairProvider)
    expect(pairProvider).toContainElement(testContent)
  })
})
