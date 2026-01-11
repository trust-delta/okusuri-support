import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // DSNが設定されている場合に有効化（本番環境では必須）
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // パフォーマンスモニタリングのサンプリングレート
  // 本番環境では10%程度を推奨（コスト削減のため）
  tracesSampleRate: 0.1,

  // セッションリプレイの設定
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // デバッグモード（開発時のみ）
  debug: false,

  integrations: [
    Sentry.replayIntegration({
      // プライバシー設定: 医療情報を含むため、入力値をマスク
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});
