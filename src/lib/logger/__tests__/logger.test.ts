/**
 * 構造化ログのテスト
 * 機密情報サニタイズとパフォーマンス記録のテスト
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthLogger, authLogger, createAuthLogger } from '../auth-logger'
import type { LoggerConfig } from '../auth-logger'

describe('AuthLogger', () => {
  let logger: AuthLogger
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>
    info: ReturnType<typeof vi.spyOn>
    warn: ReturnType<typeof vi.spyOn>
    error: ReturnType<typeof vi.spyOn>
  }

  beforeEach(() => {
    // コンソール出力をモック
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    }

    // performance.now をモック
    global.performance = {
      now: vi.fn(() => 1000),
    } as unknown as Performance

    logger = new AuthLogger()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('基本的なログ出力', () => {
    it('各ログレベルで正しく出力される', () => {
      logger.debug('Debug message')
      logger.info('Info message')
      logger.warn('Warning message')
      logger.error('Error message')

      expect(consoleSpy.log).toHaveBeenCalledWith(
        '[AUTH_LOG:DEBUG] Debug message',
        expect.objectContaining({ timestamp: expect.any(String) })
      )
      expect(consoleSpy.info).toHaveBeenCalledWith(
        '[AUTH_LOG:INFO] Info message',
        expect.objectContaining({ timestamp: expect.any(String) })
      )
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        '[AUTH_LOG:WARN] Warning message',
        expect.objectContaining({ timestamp: expect.any(String) })
      )
      expect(consoleSpy.error).toHaveBeenCalledWith(
        '[AUTH_LOG:ERROR] Error message',
        expect.objectContaining({ timestamp: expect.any(String) })
      )
    })

    it('コンテキスト付きでログ出力される', () => {
      logger.info('Test message', 'AUTH_CONTEXT')

      expect(consoleSpy.info).toHaveBeenCalledWith(
        '[AUTH_LOG:INFO] [AUTH_CONTEXT] Test message',
        expect.objectContaining({ timestamp: expect.any(String) })
      )
    })

    it('メタデータ付きでログ出力される', () => {
      const metadata = { userId: 'user123', operation: 'login' }
      logger.info('Test message', 'AUTH_CONTEXT', metadata)

      expect(consoleSpy.info).toHaveBeenCalledWith(
        '[AUTH_LOG:INFO] [AUTH_CONTEXT] Test message',
        expect.objectContaining({
          timestamp: expect.any(String),
          metadata: expect.objectContaining(metadata),
        })
      )
    })
  })

  describe('ログレベル制御', () => {
    it('設定されたレベル以下のログが出力されない', () => {
      const errorOnlyLogger = new AuthLogger({ level: 'error' })

      errorOnlyLogger.debug('Debug message')
      errorOnlyLogger.info('Info message')
      errorOnlyLogger.warn('Warning message')
      errorOnlyLogger.error('Error message')

      expect(consoleSpy.log).not.toHaveBeenCalled()
      expect(consoleSpy.info).not.toHaveBeenCalled()
      expect(consoleSpy.warn).not.toHaveBeenCalled()
      expect(consoleSpy.error).toHaveBeenCalledTimes(1)
    })

    it('各ログレベルの優先度が正しい', () => {
      const warnLogger = new AuthLogger({ level: 'warn' })

      warnLogger.debug('Debug message')
      warnLogger.info('Info message')
      warnLogger.warn('Warning message')
      warnLogger.error('Error message')

      expect(consoleSpy.log).not.toHaveBeenCalled()
      expect(consoleSpy.info).not.toHaveBeenCalled()
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1)
      expect(consoleSpy.error).toHaveBeenCalledTimes(1)
    })
  })

  describe('機密情報サニタイズ', () => {
    it('設定されたフィールドをサニタイズする', () => {
      const sensitiveData = {
        email: 'user@example.com',
        password: 'secret123',
        token: 'abc123token',
        normalField: 'normal value',
      }

      logger.info('Test message', 'AUTH_CONTEXT', sensitiveData)

      expect(consoleSpy.info).toHaveBeenCalledWith(
        '[AUTH_LOG:INFO] [AUTH_CONTEXT] Test message',
        expect.objectContaining({
          metadata: {
            email: '[REDACTED]', // メールアドレスパターンも検出される
            password: '[REDACTED]',
            token: '[REDACTED]',
            normalField: 'normal value',
          },
        })
      )
    })

    it('ネストしたオブジェクトの機密情報をサニタイズする', () => {
      const nestedData = {
        user: {
          name: 'John Doe',
          credentials: {
            password: 'secret123',
            apiKey: 'key123',
          },
        },
        normalData: 'normal',
      }

      logger.info('Test message', 'AUTH_CONTEXT', nestedData)

      expect(consoleSpy.info).toHaveBeenCalledWith(
        '[AUTH_LOG:INFO] [AUTH_CONTEXT] Test message',
        expect.objectContaining({
          metadata: {
            user: {
              name: 'John Doe',
              credentials: {
                password: '[REDACTED]',
                apiKey: '[REDACTED]',
              },
            },
            normalData: 'normal',
          },
        })
      )
    })

    it('配列内の機密情報をサニタイズする', () => {
      const arrayData = {
        users: [
          { name: 'User1', password: 'secret1' },
          { name: 'User2', password: 'secret2' },
        ],
      }

      logger.info('Test message', 'AUTH_CONTEXT', arrayData)

      expect(consoleSpy.info).toHaveBeenCalledWith(
        '[AUTH_LOG:INFO] [AUTH_CONTEXT] Test message',
        expect.objectContaining({
          metadata: {
            users: [
              { name: '[MAX_DEPTH_EXCEEDED]', password: '[REDACTED]' }, // 深度制限のため
              { name: '[MAX_DEPTH_EXCEEDED]', password: '[REDACTED]' }, // 深度制限のため
            ],
          },
        })
      )
    })

    it('文字列パターンの機密情報を検出する', () => {
      const suspiciousData = {
        maybeEmail: 'user@example.com',
        maybeCreditCard: '1234-5678-9012-3456',
        maybeToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        normalString: 'normal text',
      }

      logger.info('Test message', 'AUTH_CONTEXT', suspiciousData)

      expect(consoleSpy.info).toHaveBeenCalledWith(
        '[AUTH_LOG:INFO] [AUTH_CONTEXT] Test message',
        expect.objectContaining({
          metadata: {
            maybeEmail: '[REDACTED]',
            maybeCreditCard: '[REDACTED]',
            maybeToken: '[REDACTED]',
            normalString: 'normal text',
          },
        })
      )
    })

    it('最大深度を超えたネストを制限する', () => {
      const deeplyNestedData = {
        level1: {
          level2: {
            level3: {
              level4: {
                tooDeep: 'should be truncated',
              },
            },
          },
        },
      }

      logger.info('Test message', 'AUTH_CONTEXT', deeplyNestedData)

      expect(consoleSpy.info).toHaveBeenCalledWith(
        '[AUTH_LOG:INFO] [AUTH_CONTEXT] Test message',
        expect.objectContaining({
          metadata: {
            level1: {
              level2: {
                level3: '[MAX_DEPTH_EXCEEDED]',
              },
            },
          },
        })
      )
    })
  })

  describe('パフォーマンス記録', () => {
    it('パフォーマンスデータ付きでログ出力される', () => {
      const performanceData = {
        duration: 250,
        memoryUsage: 1024,
        timestamp: '2024-01-01T00:00:00.000Z',
        operation: 'login',
      }

      logger.withPerformance('info', 'Operation completed', performanceData, 'PERF_CONTEXT')

      expect(consoleSpy.info).toHaveBeenCalledWith(
        '[AUTH_LOG:INFO] [PERF_CONTEXT] Operation completed',
        expect.objectContaining({
          timestamp: expect.any(String),
          performance: performanceData,
        })
      )
    })

    it('認証操作の開始と完了が記録される', () => {
      const tracker = logger.authStart('login', 'user123')

      expect(consoleSpy.info).toHaveBeenCalledWith(
        '[AUTH_LOG:INFO] [AUTH_START] 認証操作開始: login',
        expect.objectContaining({
          metadata: {
            operation: 'login',
            userId: 'user123',
            trackerId: expect.any(String),
          },
        })
      )

      // 完了を記録
      tracker.complete(true, { additionalData: 'test' })

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('[AUTH_LOG:INFO] [AUTH_COMPLETE] 認証操作成功: login'),
        expect.objectContaining({
          performance: expect.objectContaining({
            duration: expect.any(Number),
            operation: 'login',
          }),
          metadata: expect.objectContaining({
            additionalData: 'test',
            success: true,
          }),
        })
      )
    })

    it('認証操作の失敗が記録される', () => {
      const tracker = logger.authStart('signup')
      const error = new Error('Validation failed')

      tracker.fail(error, { validationErrors: ['email', 'password'] })

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('[AUTH_LOG:ERROR] [AUTH_COMPLETE] 認証操作失敗: signup'),
        expect.objectContaining({
          performance: expect.objectContaining({
            duration: expect.any(Number),
            operation: 'signup',
          }),
          metadata: expect.objectContaining({
            validationErrors: ['email', 'password'],
            error: 'Validation failed',
            success: false,
          }),
        })
      )
    })
  })

  describe('設定カスタマイズ', () => {
    it('カスタム設定でLoggerを作成できる', () => {
      const customConfig: Partial<LoggerConfig> = {
        level: 'warn',
        enableConsole: false,
        sensitiveDataConfig: {
          excludeFields: ['customField'],
          maxDepth: 2,
          replaceWith: '[HIDDEN]',
        },
      }

      const customLogger = new AuthLogger(customConfig)

      // ログレベルが warn 以下のため出力されない
      customLogger.info('Info message')
      expect(consoleSpy.info).not.toHaveBeenCalled()

      // コンソール出力が無効のため出力されない
      customLogger.error('Error message')
      expect(consoleSpy.error).not.toHaveBeenCalled()
    })

    it('ファクトリー関数でLoggerを作成できる', () => {
      const factoryLogger = createAuthLogger({ level: 'error' })

      factoryLogger.warn('Warning message')
      factoryLogger.error('Error message')

      expect(consoleSpy.warn).not.toHaveBeenCalled()
      expect(consoleSpy.error).toHaveBeenCalledTimes(1)
    })
  })

  describe('デフォルトLoggerインスタンス', () => {
    it('authLoggerが正しく動作する', () => {
      authLogger.info('Test message')

      expect(consoleSpy.info).toHaveBeenCalledWith(
        '[AUTH_LOG:INFO] Test message',
        expect.objectContaining({ timestamp: expect.any(String) })
      )
    })
  })

  describe('未実装機能のテスト（失敗するテスト）', () => {
    it('統合エラーハンドリング機能の基本ログが動作する', () => {
      const testError = new Error('Test error')
      logger.error('エラーハンドリングテスト', 'TEST_CONTEXT', { error: testError.message })

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('[AUTH_LOG:ERROR] [TEST_CONTEXT]'),
        expect.objectContaining({
          metadata: expect.objectContaining({
            error: 'Test error',
          }),
        })
      )
    })

    it('Toast通知との連携を意識したログ出力が動作する', () => {
      logger.info('Toast連携テスト', 'TOAST_CONTEXT', { toastReady: true })

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('[AUTH_LOG:INFO] [TOAST_CONTEXT]'),
        expect.objectContaining({
          metadata: expect.objectContaining({
            toastReady: true,
          }),
        })
      )
    })
  })
})

describe('PerformanceTracker', () => {
  let logger: AuthLogger
  let consoleSpy: {
    info: ReturnType<typeof vi.spyOn>
    error: ReturnType<typeof vi.spyOn>
  }

  beforeEach(() => {
    consoleSpy = {
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    }

    global.performance = {
      now: vi
        .fn()
        .mockReturnValueOnce(1000) // 開始時
        .mockReturnValueOnce(1500), // 終了時
    } as unknown as Performance

    logger = new AuthLogger()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('操作成功の記録が正しく動作する', () => {
    const tracker = logger.authStart('test-operation', 'user123')
    tracker.complete(true, { result: 'success' })

    expect(consoleSpy.info).toHaveBeenCalledWith(
      expect.stringContaining('認証操作成功: test-operation (500.00ms)'),
      expect.objectContaining({
        performance: expect.objectContaining({
          duration: 500,
          operation: 'test-operation',
        }),
        metadata: expect.objectContaining({
          result: 'success',
          success: true,
        }),
      })
    )
  })

  it('操作失敗の記録が正しく動作する', () => {
    const tracker = logger.authStart('test-operation')
    const error = new Error('Test error')

    tracker.fail(error, { context: 'test' })

    expect(consoleSpy.error).toHaveBeenCalledWith(
      expect.stringContaining('認証操作失敗: test-operation (500.00ms)'),
      expect.objectContaining({
        performance: expect.objectContaining({
          duration: 500,
          operation: 'test-operation',
        }),
        metadata: expect.objectContaining({
          context: 'test',
          error: 'Test error',
          success: false,
        }),
      })
    )
  })
})
