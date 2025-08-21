/**
 * 認証システム構造化ログ
 * 機密情報を除外し、問題追跡支援とデバッグ効率化を提供
 */

/**
 * ログレベル定義
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * ログエントリの基本構造
 */
export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: string
  metadata?: Record<string, unknown>
  performance?: PerformanceData
}

/**
 * パフォーマンス記録データ
 */
export interface PerformanceData {
  duration?: number
  memoryUsage?: number
  timestamp: string
  operation: string
}

/**
 * 機密情報サニタイズ設定
 */
interface SensitiveDataConfig {
  excludeFields: string[]
  maxDepth: number
  replaceWith: string
}

/**
 * ログ設定
 */
export interface LoggerConfig {
  level: LogLevel
  enableConsole: boolean
  enableStructured: boolean
  sensitiveDataConfig: SensitiveDataConfig
  environment: 'development' | 'production' | 'test'
}

/**
 * デフォルトログ設定
 */
const DEFAULT_CONFIG: LoggerConfig = {
  level: 'debug', // デバッグ情報も含める
  enableConsole: true,
  enableStructured: true,
  sensitiveDataConfig: {
    excludeFields: [
      'password',
      'token',
      'apikey',
      'secret',
      'creditcard',
      'accesstoken',
      'refreshtoken',
    ],
    maxDepth: 3,
    replaceWith: '[REDACTED]',
  },
  environment: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
}

/**
 * 認証ログクラス
 */
export class AuthLogger {
  private config: LoggerConfig

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * ログレベルの優先度チェック
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    }
    return levels[level] >= levels[this.config.level]
  }

  /**
   * 機密情報サニタイズ
   */
  private sanitizeData(data: unknown, depth = 0): unknown {
    if (depth >= this.config.sensitiveDataConfig.maxDepth) {
      return '[MAX_DEPTH_EXCEEDED]'
    }

    if (data === null || data === undefined) {
      return data
    }

    if (typeof data === 'string') {
      // 潜在的な機密データパターンのチェック
      if (this.containsSensitivePattern(data)) {
        return this.config.sensitiveDataConfig.replaceWith
      }
      return data
    }

    if (typeof data === 'object' && !Array.isArray(data)) {
      const sanitized: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(data)) {
        if (this.config.sensitiveDataConfig.excludeFields.includes(key.toLowerCase())) {
          sanitized[key] = this.config.sensitiveDataConfig.replaceWith
        } else {
          sanitized[key] = this.sanitizeData(value, depth + 1)
        }
      }
      return sanitized
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeData(item, depth + 1))
    }

    return data
  }

  /**
   * 機密データパターンの検出
   */
  private containsSensitivePattern(value: string): boolean {
    const patterns = [
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, // メールアドレス
      /^[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{4}$/, // クレジットカード番号
      /^[A-Za-z0-9+/]{20,}={0,3}$/, // Base64トークンパターン (より緩い条件)
      /^[a-f0-9]{32,}$/, // ハッシュパターン
      /^ey[A-Za-z0-9+/]/, // JWTトークンパターン
    ]
    return patterns.some((pattern) => pattern.test(value))
  }

  /**
   * 構造化ログエントリ作成
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: string,
    metadata?: Record<string, unknown>,
    performance?: PerformanceData
  ): LogEntry {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
    }

    if (context) {
      entry.context = context
    }

    if (metadata) {
      entry.metadata = this.sanitizeData(metadata) as Record<string, unknown>
    }

    if (performance) {
      entry.performance = performance
    }

    return entry
  }

  /**
   * ログ出力
   */
  private output(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) {
      return
    }

    if (this.config.enableConsole) {
      const consoleMethod =
        entry.level === 'debug'
          ? console.log
          : entry.level === 'info'
            ? console.info
            : entry.level === 'warn'
              ? console.warn
              : console.error

      const prefix = `[AUTH_LOG:${entry.level.toUpperCase()}]`
      const contextStr = entry.context ? ` [${entry.context}]` : ''
      consoleMethod(`${prefix}${contextStr} ${entry.message}`, {
        timestamp: entry.timestamp,
        ...(entry.metadata && { metadata: entry.metadata }),
        ...(entry.performance && { performance: entry.performance }),
      })
    }
  }

  /**
   * デバッグログ
   */
  debug(message: string, context?: string, metadata?: Record<string, unknown>): void {
    this.output(this.createLogEntry('debug', message, context, metadata))
  }

  /**
   * 情報ログ
   */
  info(message: string, context?: string, metadata?: Record<string, unknown>): void {
    this.output(this.createLogEntry('info', message, context, metadata))
  }

  /**
   * 警告ログ
   */
  warn(message: string, context?: string, metadata?: Record<string, unknown>): void {
    this.output(this.createLogEntry('warn', message, context, metadata))
  }

  /**
   * エラーログ
   */
  error(message: string, context?: string, metadata?: Record<string, unknown>): void {
    this.output(this.createLogEntry('error', message, context, metadata))
  }

  /**
   * パフォーマンス記録付きログ
   */
  withPerformance(
    level: LogLevel,
    message: string,
    performance: PerformanceData,
    context?: string,
    metadata?: Record<string, unknown>
  ): void {
    this.output(this.createLogEntry(level, message, context, metadata, performance))
  }

  /**
   * 認証操作の開始記録
   */
  authStart(operation: string, userId?: string): PerformanceTracker {
    const startTime = performance.now()
    const trackerId = `${operation}_${Date.now()}`

    this.info(`認証操作開始: ${operation}`, 'AUTH_START', {
      operation,
      userId: userId || 'anonymous',
      trackerId,
    })

    return new PerformanceTracker(this, operation, startTime, trackerId)
  }

  /**
   * 認証操作の完了記録
   */
  authComplete(
    operation: string,
    success: boolean,
    duration: number,
    trackerId: string,
    metadata?: Record<string, unknown>
  ): void {
    const performanceData: PerformanceData = {
      duration,
      timestamp: new Date().toISOString(),
      operation,
    }

    const level: LogLevel = success ? 'info' : 'error'
    const status = success ? '成功' : '失敗'

    this.withPerformance(
      level,
      `認証操作${status}: ${operation} (${duration.toFixed(2)}ms)`,
      performanceData,
      'AUTH_COMPLETE',
      { ...metadata, trackerId, success }
    )
  }
}

/**
 * パフォーマンス追跡ヘルパークラス
 */
export class PerformanceTracker {
  constructor(
    private logger: AuthLogger,
    private operation: string,
    private startTime: number,
    private trackerId: string
  ) {}

  /**
   * 操作完了を記録
   */
  complete(success: boolean, metadata?: Record<string, unknown>): void {
    const duration = performance.now() - this.startTime
    this.logger.authComplete(this.operation, success, duration, this.trackerId, metadata)
  }

  /**
   * 操作失敗を記録
   */
  fail(error: unknown, metadata?: Record<string, unknown>): void {
    const errorMetadata = {
      ...metadata,
      error: error instanceof Error ? error.message : String(error),
    }
    this.complete(false, errorMetadata)
  }
}

/**
 * デフォルトLogger インスタンス
 */
export const authLogger = new AuthLogger()

/**
 * ファクトリー関数（カスタム設定用）
 */
export function createAuthLogger(config: Partial<LoggerConfig>): AuthLogger {
  return new AuthLogger(config)
}
