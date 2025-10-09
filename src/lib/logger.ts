/**
 * Logger Utility
 * 開発時にデバッグ情報を出力し、本番環境では無効化できるロガー
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enabled: boolean;
  level: LogLevel;
  prefix?: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      enabled: process.env.NODE_ENV !== 'production',
      level: (process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel) || 'debug',
      ...config,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) {
      return false;
    }
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.level];
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    const prefix = this.config.prefix ? `[${this.config.prefix}]` : '';
    return `[${timestamp}] [${level.toUpperCase()}]${prefix} ${message}`;
  }

  private log(level: LogLevel, message: string, ...args: unknown[]): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const formattedMessage = this.formatMessage(level, message);

    switch (level) {
      case 'debug':
        console.debug(formattedMessage, ...args);
        break;
      case 'info':
        console.info(formattedMessage, ...args);
        break;
      case 'warn':
        console.warn(formattedMessage, ...args);
        break;
      case 'error':
        console.error(formattedMessage, ...args);
        break;
    }
  }

  debug(message: string, ...args: unknown[]): void {
    this.log('debug', message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.log('info', message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.log('warn', message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    this.log('error', message, ...args);
  }

  /**
   * 特定の処理時間を計測
   */
  async time<T>(label: string, fn: () => Promise<T>): Promise<T> {
    if (!this.shouldLog('debug')) {
      return fn();
    }

    const start = performance.now();
    this.debug(`⏱️ ${label} - 開始`);

    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.debug(`⏱️ ${label} - 完了 (${duration.toFixed(2)}ms)`);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.error(`⏱️ ${label} - エラー (${duration.toFixed(2)}ms)`, error);
      throw error;
    }
  }

  /**
   * 新しいLoggerインスタンスを作成（prefix付き）
   */
  withPrefix(prefix: string): Logger {
    return new Logger({
      ...this.config,
      prefix: this.config.prefix ? `${this.config.prefix}:${prefix}` : prefix,
    });
  }
}

// デフォルトのloggerインスタンスをエクスポート
export const logger = new Logger();

// 特定のモジュール用にprefixを付けたloggerを作成するヘルパー
export const createLogger = (prefix: string, config?: Partial<LoggerConfig>): Logger => {
  return new Logger({ ...config, prefix });
};

export type { LogLevel, LoggerConfig };
