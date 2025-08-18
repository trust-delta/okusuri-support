/**
 * グローバル状態管理のエクスポート
 *
 * 複数の機能やコンポーネントで使用される状態を一元管理:
 * - API取得データの状態管理
 * - 機能横断的な状態（テーマ、認証状態等）
 * - 複数状態の合成・計算による新たな状態
 *
 * 機能関心ごと、またはAPIエンドポイントごとのファイル名:
 * - stores/user.ts
 * - stores/post.ts
 * - stores/target-points.ts (合成状態の例)
 */

// 現在は空ですが、将来的に状態管理ストアを配置予定
// export { userStore } from './user';
// export { postStore } from './post';
// export { themeStore } from './theme';

// TypeScriptエラー回避のための空のエクスポート
export {}
