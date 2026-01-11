import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // セキュリティヘッダーの設定
  async headers() {
    return [
      {
        // すべてのルートに適用
        source: "/:path*",
        headers: [
          // クリックジャッキング対策
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          // MIMEタイプスニッフィング対策
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // Referrer情報の制御
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // XSS対策（レガシーブラウザ向け）
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          // HTTPS強制（Vercelでは自動設定されるが明示的に指定）
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          // 権限ポリシー（不要な機能を無効化）
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

// Sentry設定オプション
const sentryWebpackPluginOptions = {
  // ソースマップのアップロード設定
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // 本番ビルド時のみソースマップをアップロード
  silent: !process.env.CI,

  // ソースマップを公開しない（セキュリティ）
  hideSourceMaps: true,

  // ビルド時にソースマップを自動削除
  disableServerWebpackPlugin: false,
  disableClientWebpackPlugin: false,

  // Telemetryを無効化
  telemetry: false,
};

// Sentryが設定されている場合のみラップ
export default process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig;
