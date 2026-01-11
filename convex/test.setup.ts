// convex-test 用のセットアップファイル
// .ts, .js を含み、.d.ts, .test.ts を除外するパターン

// biome-ignore lint/suspicious/noExplicitAny: import.meta.glob is Vite-specific
export const modules = (import.meta as any).glob("./**/!(*.*.*)*.*s");
