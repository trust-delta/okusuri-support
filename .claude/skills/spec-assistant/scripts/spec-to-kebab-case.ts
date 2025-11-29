#!/usr/bin/env node

/**
 * kebab-case変換スクリプト
 * 使い方: tsx spec-to-kebab-case.ts "機能名"
 * 例: tsx spec-to-kebab-case.ts "通知機能"
 * 例: tsx spec-to-kebab-case.ts "リマインダー設定"
 */

/** 日本語→英語の翻訳マップ */
const TRANSLATION_MAP: Record<string, string> = {
  // 一般的な単語
  機能: "feature",
  設定: "settings",
  管理: "management",
  一覧: "list",
  詳細: "detail",
  登録: "registration",
  編集: "edit",
  削除: "delete",
  作成: "create",
  更新: "update",
  検索: "search",
  ダッシュボード: "dashboard",
  統計: "statistics",

  // プロジェクト固有の単語
  服薬: "medication",
  薬: "medicine",
  薬剤: "medication",
  通知: "notification",
  リマインダー: "reminder",
  グループ: "group",
  認証: "auth",
  ユーザー: "user",
  患者: "patient",
  サポーター: "supporter",
  履歴: "history",
  オンボーディング: "onboarding",
  プロフィール: "profile",
  アカウント: "account",
  カレンダー: "calendar",
  スケジュール: "schedule",
  処方箋: "prescription",
  招待: "invitation",

  // API関連
  API: "api",
  クエリ: "query",
  ミューテーション: "mutation",
  アクション: "action",
};

/**
 * 日本語文字列をkebab-caseに変換
 */
export function toKebabCase(input: string): string {
  let result = input;

  // 1. 翻訳マップによる置換
  for (const [jp, en] of Object.entries(TRANSLATION_MAP)) {
    result = result.replace(new RegExp(jp, "g"), `${en} `);
  }

  // 2. 英数字以外をスペースに変換
  result = result.replace(/[^a-zA-Z0-9]/g, " ");

  // 3. 連続するスペースを1つに
  result = result.replace(/\s+/g, " ");

  // 4. 前後の空白を削除
  result = result.trim();

  // 5. スペースをハイフンに変換
  result = result.replace(/\s/g, "-");

  // 6. すべて小文字に
  result = result.toLowerCase();

  // 7. 連続するハイフンを1つに
  result = result.replace(/-+/g, "-");

  // 8. 前後のハイフンを削除
  result = result.replace(/^-+|-+$/g, "");

  return result;
}

// CLI として実行された場合
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("エラー: 変換する文字列を指定してください。");
    console.error("使い方: tsx spec-to-kebab-case.ts \"機能名\"");
    process.exit(1);
  }

  const input = args.join(" ");
  const result = toKebabCase(input);
  console.log(result);
}
