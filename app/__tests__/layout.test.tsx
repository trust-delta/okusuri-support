import { render } from '@testing-library/react'
import React from 'react'
import { describe, expect, it } from 'vitest'
import RootLayout, { metadata } from '../layout'

describe('RootLayout', () => {
  it('should render children correctly', () => {
    const testContent = 'Test Content'
    const { getByText } = render(
      <RootLayout>
        <div>{testContent}</div>
      </RootLayout>
    )

    expect(getByText(testContent)).toBeInTheDocument()
  })

  it('should have correct metadata', () => {
    expect(metadata.title).toBe('お薬サポートアプリ')
    expect(metadata.description).toBe('服薬記録と支援のためのアプリケーション')
  })
})
