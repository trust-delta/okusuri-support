/**
 * PairProvider単体テスト
 */

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PairProvider, usePairContext } from '../PairProvider'

// フックのモック
vi.mock('../../../hooks/use-pairs', () => ({
  usePair: vi.fn(() => ({
    currentPair: null,
    pairPartner: null,
    hasPair: false,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    reset: vi.fn(),
  })),
  usePairPermissions: vi.fn(() => ({
    hasFullPermission: false,
    hasReadPermission: false,
    currentRole: null,
  })),
}))

// テスト用コンポーネント
const TestConsumer = () => {
  const pairContext = usePairContext()
  return (
    <div>
      <div data-testid="has-pair">{pairContext.hasPair.toString()}</div>
      <div data-testid="is-loading">{pairContext.isLoading.toString()}</div>
      <div data-testid="current-pair">
        {pairContext.currentPair ? pairContext.currentPair.id : 'null'}
      </div>
    </div>
  )
}

describe('PairProvider', () => {
  it('should provide pair context to children', () => {
    render(
      <PairProvider>
        <TestConsumer />
      </PairProvider>
    )

    expect(screen.getByTestId('has-pair')).toHaveTextContent('false')
    expect(screen.getByTestId('is-loading')).toHaveTextContent('false')
    expect(screen.getByTestId('current-pair')).toHaveTextContent('null')
  })

  it('should throw error when usePairContext is used outside provider', () => {
    const ComponentOutsideProvider = () => {
      try {
        usePairContext()
        return <div>No error</div>
      } catch {
        return (
          <div data-testid="context-error">usePairContext must be used within a PairProvider</div>
        )
      }
    }

    render(<ComponentOutsideProvider />)

    expect(screen.getByTestId('context-error')).toBeInTheDocument()
  })
})
