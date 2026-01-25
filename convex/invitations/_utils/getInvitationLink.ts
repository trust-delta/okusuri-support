/**
 * 招待リンクを生成する
 *
 * @param code 招待コード
 * @returns 招待リンクURL
 *
 * @remarks
 * NEXT_PUBLIC_APP_URL が未設定の場合はフォールバックとして localhost:3000 を使用し、
 * 警告ログを出力する。本番環境では環境変数が設定されていることを前提とする。
 */
export function getInvitationLink(code: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  // セキュリティ: 本番環境では環境変数が必須
  if (!appUrl) {
    console.warn(
      "[WARNING] NEXT_PUBLIC_APP_URL is not set. Using localhost fallback. " +
        "This should not happen in production.",
    );
  }
  return `${appUrl || "http://localhost:3000"}/invite/${code}`;
}
