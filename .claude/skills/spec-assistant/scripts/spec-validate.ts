#!/usr/bin/env node

import * as fs from "node:fs";
import * as path from "node:path";

/**
 * 仕様書バリデーションスクリプト
 * 使い方: tsx spec-validate.ts <仕様書ファイルパス> [タイプ]
 * 例: tsx spec-validate.ts .context/specs/features/medication.md feature
 * 例: tsx spec-validate.ts .context/specs/api/auth-api.md api
 */

type SpecType = "feature" | "api" | "unknown";

interface ValidationResult {
  errors: string[];
  warnings: string[];
  passes: string[];
}

/**
 * セクションの存在をチェック
 */
function checkSection(
  content: string,
  sectionName: string,
  pattern: RegExp,
  result: ValidationResult,
): boolean {
  if (pattern.test(content)) {
    result.passes.push(sectionName);
    return true;
  }
  result.errors.push(`${sectionName} が見つかりません`);
  return false;
}

/**
 * ファイルタイプを自動判定
 */
function detectSpecType(filePath: string): SpecType {
  if (filePath.includes("/features/")) {
    return "feature";
  }
  if (filePath.includes("/api/")) {
    return "api";
  }
  return "unknown";
}

/**
 * 仕様書をバリデーション
 */
export function validateSpec(
  filePath: string,
  type?: SpecType,
): ValidationResult {
  const result: ValidationResult = {
    errors: [],
    warnings: [],
    passes: [],
  };

  // ファイル存在チェック
  if (!fs.existsSync(filePath)) {
    result.errors.push(`ファイルが見つかりません: ${filePath}`);
    return result;
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const specType = type || detectSpecType(filePath);

  // ファイル名チェック
  const basename = path.basename(filePath);
  if (/^[a-z0-9-]+\.md$/.test(basename)) {
    result.passes.push("ファイル名: kebab-case形式");
  } else {
    result.errors.push(`ファイル名がkebab-case形式ではありません: ${basename}`);
  }

  // API仕様書のファイル名チェック
  if (specType === "api" && !basename.endsWith("-api.md")) {
    result.warnings.push(
      "API仕様書のファイル名は '[feature-name]-api.md' 形式が推奨されます",
    );
  }

  // 共通セクションチェック
  checkSection(content, "タイトル", /^#\s+/m, result);
  checkSection(content, "概要セクション", /^##\s+概要/m, result);

  // 最終更新日チェック
  if (/最終更新.*20[0-9]{2}年[0-9]{1,2}月[0-9]{1,2}日/.test(content)) {
    result.passes.push("最終更新日 (YYYY年MM月DD日形式)");
  } else {
    result.errors.push(
      "最終更新日が見つからないか、形式が不正です (YYYY年MM月DD日形式が必要)",
    );
  }

  // タイプ別の必須セクション
  if (specType === "feature") {
    checkSection(content, "ユースケース", /^##\s+ユースケース/m, result);
    checkSection(content, "機能要件", /^##\s+機能要件/m, result);
    checkSection(content, "データモデル", /^##\s+データモデル/m, result);
    checkSection(content, "UI/UX要件", /^##\s+UI\/UX要件/m, result);

    // TypeScript形式のデータモデルチェック
    if (/^(interface|type)\s+\w+/m.test(content)) {
      result.passes.push("データモデル (TypeScript形式)");
    } else {
      result.warnings.push("TypeScript形式のデータモデル定義が見つかりません");
    }
  } else if (specType === "api") {
    // Queries/Mutations/Actionsのいずれか
    if (/^##\s+(Queries|Mutations|Actions)/m.test(content)) {
      result.passes.push("API関数定義 (Queries/Mutations/Actions)");
    } else {
      result.errors.push(
        "API関数定義が見つかりません (Queries/Mutations/Actions)",
      );
    }

    checkSection(content, "データモデル", /^##\s+データモデル/m, result);

    // コード例チェック
    if (/```(typescript|ts)/.test(content)) {
      result.passes.push("コード例 (TypeScript形式)");
    } else {
      result.warnings.push("TypeScript形式のコード例が見つかりません");
    }
  }

  return result;
}

// CLI として実行された場合
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("エラー: 仕様書ファイルパスを指定してください。");
    console.error("使い方: tsx spec-validate.ts <仕様書ファイルパス> [タイプ]");
    process.exit(1);
  }

  const filePath = args[0];
  const type = args[1] as SpecType | undefined;
  const specType = type || detectSpecType(filePath);

  console.log(`=== 仕様書バリデーション: ${filePath} ===`);
  console.log(`タイプ: ${specType}`);
  console.log("");

  const result = validateSpec(filePath, type);

  // パスした項目を表示
  for (const pass of result.passes) {
    console.log(`✅ ${pass}`);
  }

  // 警告を表示
  for (const warning of result.warnings) {
    console.log(`⚠️  警告: ${warning}`);
  }

  // エラーを表示
  for (const error of result.errors) {
    console.log(`❌ エラー: ${error}`);
  }

  // 結果サマリー
  console.log("");
  console.log("=== バリデーション結果 ===");
  console.log(`エラー: ${result.errors.length}`);
  console.log(`警告: ${result.warnings.length}`);

  if (result.errors.length === 0 && result.warnings.length === 0) {
    console.log("✅ すべてのチェックに合格しました");
    process.exit(0);
  } else if (result.errors.length === 0) {
    console.log(`⚠️  警告があります (${result.warnings.length}件)`);
    process.exit(0);
  } else {
    console.log(`❌ エラーがあります (${result.errors.length}件)`);
    process.exit(1);
  }
}
