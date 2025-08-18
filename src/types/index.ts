/**
 * アプリ全体で共通する型定義のエクスポート
 *
 * 型安全性と重複排除を目的として、アプリ内で使用する型を一元管理:
 * - 共通のビジネスドメイン型
 * - API レスポンス型
 * - コンポーネントプロパティの共通型
 *
 * 機能名で分類したファイル構成:
 * - types/user.ts
 * - types/post.ts
 * - types/api.ts
 */

// 現在は空ですが、将来的に共通型定義を配置予定
// export type { User, UserProfile } from './user';
// export type { Post, PostStatus } from './post';
// export type { ApiResponse, ApiError } from './api';

// TypeScriptエラー回避のための空のエクスポート
export {}
