// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // DSNが設定されている場合に有効化
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // パフォーマンスモニタリングのサンプリングレート
  // 本番環境では10%程度を推奨（コスト削減のため）
  tracesSampleRate: 0.1,

  // ログ送信を有効化
  enableLogs: true,

  // 医療アプリのためPII（個人情報）送信は無効化
  sendDefaultPii: false,
});
