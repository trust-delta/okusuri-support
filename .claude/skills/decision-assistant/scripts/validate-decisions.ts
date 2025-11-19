#!/usr/bin/env node

import * as fs from "node:fs";
import * as path from "node:path";
import matter from "gray-matter";

/**
 * バリデーションエラー
 */
interface ValidationError {
  filePath: string;
  title: string;
  errors: string[];
  warnings: string[];
}

/**
 * 必須セクション
 */
const REQUIRED_SECTIONS = [
  "背景",
  "決定",
  "理由",
  "利点",
  "欠点と対応策",
  "代替案",
];

/**
 * 有効なステータス値
 */
const VALID_STATUSES = ["承認済み", "提案中", "却下", "廃止", "実装完了"];

/**
 * 決定記録ディレクトリから全ファイルを取得
 */
function getAllDecisionFiles(decisionsDir: string): string[] {
  const files: string[] = [];

  function traverse(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name !== "templates") {
          traverse(fullPath);
        }
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        files.push(fullPath);
      }
    }
  }

  traverse(decisionsDir);
  return files;
}

/**
 * 決定記録ファイルをバリデーション
 */
function validateDecisionFile(filePath: string): ValidationError | null {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");

    // タイトルの抽出
    const titleMatch = fileContent.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].replace(/^決定記録:\s*/, "") : "";

    if (!titleMatch) {
      errors.push("タイトル（# 見出し）が見つかりません");
    }

    // ステータスの抽出とバリデーション
    const statusMatch = fileContent.match(/\*\*ステータス\*\*:\s*(.+)$/m);
    if (!statusMatch) {
      errors.push("ステータスが見つかりません");
    } else {
      const status = statusMatch[1].trim();
      const isValidStatus = VALID_STATUSES.some((validStatus) =>
        status.includes(validStatus),
      );
      if (!isValidStatus) {
        errors.push(
          `無効なステータス: "${status}" (有効: ${VALID_STATUSES.join(", ")})`,
        );
      }
    }

    // 日付の抽出とバリデーション
    const dateMatch = fileContent.match(/\*\*日付\*\*:\s*(.+)$/m);
    if (!dateMatch) {
      errors.push("日付が見つかりません");
    } else {
      const date = dateMatch[1].trim();
      // YYYY年MM月DD日 形式をチェック
      const isValidDate = /\d{4}年\d{1,2}月\d{1,2}日/.test(date);
      if (!isValidDate) {
        warnings.push(
          `日付の形式が推奨形式ではありません: "${date}" (推奨: YYYY年MM月DD日)`,
        );
      }
    }

    // 決定者の抽出
    const deciderMatch = fileContent.match(/\*\*決定者\*\*:\s*(.+)$/m);
    if (!deciderMatch) {
      warnings.push("決定者が記載されていません");
    }

    // 必須セクションのチェック
    for (const section of REQUIRED_SECTIONS) {
      const sectionRegex = new RegExp(`##\\s+${section}`, "m");
      if (!sectionRegex.test(fileContent)) {
        errors.push(`必須セクション「${section}」が見つかりません`);
      }
    }

    // 利点のチェック（最低2つ）
    const advantagesMatch = fileContent.match(/✅\s+/g);
    if (advantagesMatch && advantagesMatch.length < 2) {
      warnings.push(
        `利点が${advantagesMatch.length}件のみです（推奨: 2件以上）`,
      );
    } else if (!advantagesMatch) {
      errors.push("利点（✅）が見つかりません");
    }

    // 欠点のチェック
    const disadvantagesMatch = fileContent.match(/❌\s+/g);
    if (!disadvantagesMatch) {
      warnings.push("欠点（❌）が記載されていません");
    }

    // 代替案のチェック（最低2つ）
    const alternativeMatches = fileContent.match(/###\s+代替案\d+:/g);
    if (alternativeMatches && alternativeMatches.length < 2) {
      warnings.push(
        `代替案が${alternativeMatches.length}件のみです（推奨: 2件以上）`,
      );
    } else if (!alternativeMatches) {
      errors.push("代替案が見つかりません");
    }

    // ファイル名のバリデーション
    const fileName = path.basename(filePath, ".md");
    // YYYY-MM-DD-kebab-case 形式をチェック
    const isValidFileName = /^\d{4}-\d{2}-\d{2}-.+$/.test(fileName);
    if (!isValidFileName) {
      errors.push(
        `ファイル名が推奨形式ではありません: "${fileName}" (推奨: YYYY-MM-DD-kebab-case)`,
      );
    }

    // kebab-case チェック
    const topicPart = fileName.replace(/^\d{4}-\d{2}-\d{2}-/, "");
    const isKebabCase = /^[a-z0-9-]+$/.test(topicPart);
    if (!isKebabCase && isValidFileName) {
      errors.push(
        `ファイル名のトピック部分がkebab-caseではありません: "${topicPart}"`,
      );
    }

    // 関連ドキュメントセクションのチェック
    if (!fileContent.includes("## 関連ドキュメント")) {
      warnings.push("関連ドキュメントセクションが見つかりません");
    }

    // 更新履歴セクションのチェック
    if (!fileContent.includes("## 更新履歴")) {
      warnings.push("更新履歴セクションが見つかりません");
    }

    // エラーまたは警告がある場合のみ返す
    if (errors.length > 0 || warnings.length > 0) {
      return {
        filePath,
        title: title || fileName,
        errors,
        warnings,
      };
    }

    return null;
  } catch (error) {
    return {
      filePath,
      title: path.basename(filePath),
      errors: [`ファイルの読み込みエラー: ${error}`],
      warnings: [],
    };
  }
}

/**
 * 全決定記録をバリデーション
 */
export function validateAllDecisions(): void {
  const projectRoot = process.cwd();
  const decisionsDir = path.join(projectRoot, ".context", "decisions");

  if (!fs.existsSync(decisionsDir)) {
    console.error(`Decisions directory not found: ${decisionsDir}`);
    process.exit(1);
  }

  const files = getAllDecisionFiles(decisionsDir);
  const validationResults: ValidationError[] = [];

  for (const filePath of files) {
    const result = validateDecisionFile(filePath);
    if (result) {
      validationResults.push(result);
    }
  }

  // 結果の出力
  console.log("🔍 決定記録バリデーション結果\n");

  if (validationResults.length === 0) {
    console.log("✅ すべての決定記録が適合しています！\n");
    console.log(`チェック済み: ${files.length}件`);
    return;
  }

  console.log(
    `⚠️  ${validationResults.length}件の決定記録に問題が見つかりました\n`,
  );

  for (const result of validationResults) {
    const relativePath = path.relative(projectRoot, result.filePath);
    console.log(`📄 ${result.title}`);
    console.log(`   ${relativePath}\n`);

    if (result.errors.length > 0) {
      console.log("   ❌ エラー:");
      for (const error of result.errors) {
        console.log(`      - ${error}`);
      }
      console.log();
    }

    if (result.warnings.length > 0) {
      console.log("   ⚠️  警告:");
      for (const warning of result.warnings) {
        console.log(`      - ${warning}`);
      }
      console.log();
    }
  }

  // サマリー
  const totalErrors = validationResults.reduce(
    (sum, r) => sum + r.errors.length,
    0,
  );
  const totalWarnings = validationResults.reduce(
    (sum, r) => sum + r.warnings.length,
    0,
  );

  console.log("━━━ サマリー ━━━");
  console.log(`チェック済み: ${files.length}件`);
  console.log(`問題あり: ${validationResults.length}件`);
  console.log(`エラー: ${totalErrors}件`);
  console.log(`警告: ${totalWarnings}件`);
}

// CLI として実行された場合
if (require.main === module) {
  validateAllDecisions();
}
