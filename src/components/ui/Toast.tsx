/**
 * Toast通知コンポーネント
 * エラーメッセージとユーザーフィードバックの統一表示
 */

'use client'

import type React from 'react'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

/**
 * Toast通知の種類
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info'

/**
 * Toast通知のメッセージ構造
 */
export interface ToastMessage {
  id: string
  type: ToastType
  title: string
  description?: string
  duration?: number
  isRetryable?: boolean
  onRetry?: () => void
  action?: {
    label: string
    onClick: () => void
  }
}

/**
 * Toast通知オプション
 */
export interface ToastOptions {
  duration?: number
  isRetryable?: boolean
  onRetry?: () => void
  action?: {
    label: string
    onClick: () => void
  }
}

/**
 * Toastコンテキストの値型
 */
interface ToastContextValue {
  toasts: ToastMessage[]
  showToast: (
    type: ToastType,
    title: string,
    description?: string,
    options?: ToastOptions
  ) => string
  hideToast: (id: string) => void
  clearAllToasts: () => void
}

/**
 * Toastコンテキスト
 */
const ToastContext = createContext<ToastContextValue | null>(null)

/**
 * Toast通知プロバイダー
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  /**
   * Toast通知を非表示
   */
  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  /**
   * Toast通知を表示
   */
  const showToast = useCallback(
    (type: ToastType, title: string, description?: string, options: ToastOptions = {}): string => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const duration = options.duration ?? getDefaultDuration(type)

      const newToast: ToastMessage = {
        id,
        type,
        title,
        ...(description && { description }),
        duration,
        ...(options.isRetryable && { isRetryable: options.isRetryable }),
        ...(options.onRetry && { onRetry: options.onRetry }),
        ...(options.action && { action: options.action }),
      }

      setToasts((prev) => [...prev, newToast])

      // 自動削除（duration が 0 の場合は手動削除のみ）
      if (duration > 0) {
        setTimeout(() => {
          hideToast(id)
        }, duration)
      }

      return id
    },
    [hideToast]
  )

  /**
   * 全てのToast通知をクリア
   */
  const clearAllToasts = useCallback(() => {
    setToasts([])
  }, [])

  const value: ToastContextValue = {
    toasts,
    showToast,
    hideToast,
    clearAllToasts,
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}

/**
 * Toast通知フック
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

/**
 * Toast通知コンテナー
 */
function ToastContainer() {
  const { toasts } = useToast()

  if (toasts.length === 0) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  )
}

/**
 * 個別Toast通知アイテム
 */
function ToastItem({ toast }: { toast: ToastMessage }) {
  const { hideToast } = useToast()
  const [isVisible, setIsVisible] = useState(false)

  // フェードイン効果
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  /**
   * 閉じるボタンのハンドラー
   */
  const handleClose = useCallback(() => {
    setIsVisible(false)
    setTimeout(() => hideToast(toast.id), 150) // フェードアウト後に削除
  }, [toast.id, hideToast])

  /**
   * 再試行ボタンのハンドラー
   */
  const handleRetry = useCallback(() => {
    if (toast.onRetry) {
      toast.onRetry()
      handleClose()
    }
  }, [toast, handleClose])

  /**
   * アクションボタンのハンドラー
   */
  const handleAction = useCallback(() => {
    if (toast.action) {
      toast.action.onClick()
      handleClose()
    }
  }, [toast.action, handleClose])

  return (
    <div
      className={`
        transform transition-all duration-200 ease-in-out
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        bg-white dark:bg-gray-800 
        border border-gray-200 dark:border-gray-700
        rounded-lg shadow-lg p-4 min-w-80
        ${getToastStyles(toast.type)}
      `}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        {/* アイコン */}
        <div className="flex-shrink-0 mt-0.5">{getToastIcon(toast.type)}</div>

        {/* メッセージ内容 */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">{toast.title}</h4>
          {toast.description && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{toast.description}</p>
          )}

          {/* アクションボタン */}
          {(toast.isRetryable || toast.action) && (
            <div className="mt-3 flex gap-2">
              {toast.isRetryable && (
                <button
                  type="button"
                  onClick={handleRetry}
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                >
                  再試行
                </button>
              )}
              {toast.action && (
                <button
                  type="button"
                  onClick={handleAction}
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                >
                  {toast.action.label}
                </button>
              )}
            </div>
          )}
        </div>

        {/* 閉じるボタン */}
        <button
          type="button"
          onClick={handleClose}
          className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="通知を閉じる"
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  )
}

/**
 * デフォルト表示時間を取得
 */
function getDefaultDuration(type: ToastType): number {
  const durations: Record<ToastType, number> = {
    success: 4000,
    info: 5000,
    warning: 6000,
    error: 8000, // エラーは長めに表示
  }
  return durations[type]
}

/**
 * Toast種類別のスタイルを取得
 */
function getToastStyles(type: ToastType): string {
  const styles: Record<ToastType, string> = {
    success: 'border-l-4 border-l-green-500',
    error: 'border-l-4 border-l-red-500',
    warning: 'border-l-4 border-l-yellow-500',
    info: 'border-l-4 border-l-blue-500',
  }
  return styles[type]
}

/**
 * Toast種類別のアイコンを取得
 */
function getToastIcon(type: ToastType): React.JSX.Element {
  const iconProps = 'w-5 h-5'

  switch (type) {
    case 'success':
      return (
        <svg
          className={`${iconProps} text-green-500`}
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-label="成功"
          role="img"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      )
    case 'error':
      return (
        <svg
          className={`${iconProps} text-red-500`}
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-label="エラー"
          role="img"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
      )
    case 'warning':
      return (
        <svg
          className={`${iconProps} text-yellow-500`}
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-label="警告"
          role="img"
        >
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      )
    case 'info':
      return (
        <svg
          className={`${iconProps} text-blue-500`}
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-label="情報"
          role="img"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
      )
    default:
      return (
        <svg
          className={`${iconProps} text-gray-500`}
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-label="通知"
          role="img"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
      )
  }
}

/**
 * 閉じるアイコン
 */
function CloseIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-label="閉じる" role="img">
      <path
        fillRule="evenodd"
        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  )
}

/**
 * 便利なToastヘルパー関数
 */
export const toast = {
  success: (title: string, description?: string, options?: ToastOptions) => {
    if (typeof window !== 'undefined') {
      // ブラウザ環境でのみ実行
      const event = new CustomEvent('show-toast', {
        detail: { type: 'success', title, description, options },
      })
      window.dispatchEvent(event)
    }
  },

  error: (title: string, description?: string, options?: ToastOptions) => {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('show-toast', {
        detail: { type: 'error', title, description, options },
      })
      window.dispatchEvent(event)
    }
  },

  warning: (title: string, description?: string, options?: ToastOptions) => {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('show-toast', {
        detail: { type: 'warning', title, description, options },
      })
      window.dispatchEvent(event)
    }
  },

  info: (title: string, description?: string, options?: ToastOptions) => {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('show-toast', {
        detail: { type: 'info', title, description, options },
      })
      window.dispatchEvent(event)
    }
  },
}

/**
 * ToastとAuthErrorの統合ヘルパー
 */
export function showAuthError(error: unknown, context?: string): void {
  // AuthErrorとの統合（Refactor Phase実装）
  let title: string
  let description: string | undefined
  let isRetryable = false

  // AuthErrorかどうかを判定（型ガードの簡易版）
  if (error && typeof error === 'object' && 'type' in error && 'userMessage' in error) {
    const authError = error as { type: string; userMessage: string; isRetryable?: boolean }
    title = authError.userMessage
    description = context
    isRetryable = authError.isRetryable || false
  } else {
    title = error instanceof Error ? error.message : 'エラーが発生しました'
    description = context
  }

  if (typeof window !== 'undefined') {
    const event = new CustomEvent('show-toast', {
      detail: {
        type: 'error',
        title,
        description,
        options: {
          duration: 8000,
          isRetryable,
        },
      },
    })
    window.dispatchEvent(event)
  }

  console.error('Auth error occurred:', error, context)
}

/**
 * Toast通知のイベントリスナー設定
 */
export function setupToastEventListeners(showToast: ToastContextValue['showToast']): () => void {
  const handleToastEvent = (event: CustomEvent) => {
    const { type, title, description, options } = event.detail
    showToast(type, title, description, options)
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('show-toast', handleToastEvent as EventListener)

    return () => {
      window.removeEventListener('show-toast', handleToastEvent as EventListener)
    }
  }

  return () => {}
}
