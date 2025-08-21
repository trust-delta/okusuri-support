/**
 * AuthProvider単体テスト
 */

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuthContext } from '../AuthProvider'

// useAuthフックのモック
vi.mock('../../../hooks/use-auth', () => ({
  useAuth: vi.fn(() => ({
    isLoading: false,
    isAuthenticated: false,
    isUnauthenticated: true,
    hasError: false,
    user: null,
    error: null,
    isPatient: false,
    isSupporter: false,
    refresh: vi.fn(),
  })),
}))

// テスト用コンポーネント
const TestConsumer = () => {
  const authContext = useAuthContext()
  return (
    <div>
      <div data-testid="is-loading">{authContext.isLoading.toString()}</div>
      <div data-testid="is-authenticated">{authContext.isAuthenticated.toString()}</div>
      <div data-testid="user">{authContext.user ? authContext.user.name : 'null'}</div>
    </div>
  )
}

describe('AuthProvider', () => {
  it('should provide auth context to children', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    expect(screen.getByTestId('is-loading')).toHaveTextContent('false')
    expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false')
    expect(screen.getByTestId('user')).toHaveTextContent('null')
  })

  it('should throw error when useAuthContext is used outside provider', () => {
    // エラーをキャッチするためのWrapperコンポーネント
    const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
      try {
        return <>{children}</>
      } catch {
        return <div data-testid="error">Error caught</div>
      }
    }

    const ComponentOutsideProvider = () => {
      try {
        useAuthContext()
        return <div>No error</div>
      } catch {
        return (
          <div data-testid="context-error">useAuthContext must be used within an AuthProvider</div>
        )
      }
    }

    render(
      <ErrorBoundary>
        <ComponentOutsideProvider />
      </ErrorBoundary>
    )

    expect(screen.getByTestId('context-error')).toBeInTheDocument()
  })
})
