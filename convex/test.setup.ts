// convex-test 用のセットアップファイル
// .ts, .js を含み、.d.ts, .test.ts を除外するパターン

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const modules = (import.meta as any).glob("./**/!(*.*.*)*.*s");
