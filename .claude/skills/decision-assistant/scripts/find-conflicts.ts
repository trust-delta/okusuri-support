#!/usr/bin/env node

import * as fs from "node:fs";
import * as path from "node:path";
import matter from "gray-matter";

/**
 * 競合の可能性がある決定記録
 */
interface ConflictingDecision {
  /** ファイルパス */
  filePath: string;
  /** タイトル */
  title: string;
  /** ステータス */
  status: string;
  /** 日付 */
  date: string;
  /** 競合理由 */
  conflictReasons: string[];
  /** リスクレベル (1-3: 1=低, 2=中, 3=高) */
  riskLevel: number;
}

/**
 * 決定記録のメタデータ
 */
interface DecisionMetadata {
  filePath: string;
  title: string;
  status: string;
  date: string;
  content: string;
}

/**
 * 競合パターン（相反するキーワードペア）
 */
const CONFLICT_PATTERNS = [
  {
    positive: ["採用", "使用", "導入", "移行"],
    negative: ["廃止", "削除", "除外", "非推奨"],
  },
  {
    positive: ["許可", "有効化", "enable"],
    negative: ["禁止", "無効化", "disable"],
  },
  { positive: ["追加", "導入", "統合"], negative: ["削除", "除去", "分離"] },
  { positive: ["strict", "厳格"], negative: ["緩和", "例外", "any"] },
];

/**
 * 技術スタック・カテゴリのキーワード
 */
const TECHNOLOGY_CATEGORIES = {
  auth: ["認証", "auth", "clerk", "convex auth", "supabase auth", "nextauth"],
  ui: ["ui", "shadcn", "radix", "material-ui", "ant design", "chakra"],
  form: ["フォーム", "form", "react-hook-form", "formik", "tanstack form"],
  package: [
    "パッケージマネージャ",
    "package manager",
    "npm",
    "pnpm",
    "yarn",
    "bun",
  ],
  framework: [
    "フレームワーク",
    "framework",
    "next.js",
    "react",
    "vue",
    "svelte",
  ],
  database: [
    "データベース",
    "database",
    "convex",
    "supabase",
    "postgresql",
    "mongodb",
  ],
  testing: ["テスト", "testing", "vitest", "jest", "playwright", "cypress"],
};

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
 * 決定記録ファイルをパース
 */
function parseDecisionFile(filePath: string): DecisionMetadata | null {
  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const _parsed = matter(fileContent);

    const titleMatch = fileContent.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].replace(/^決定記録:\s*/, "") : "";

    const statusMatch = fileContent.match(/\*\*ステータス\*\*:\s*(.+)$/m);
    const status = statusMatch ? statusMatch[1].trim() : "";

    const dateMatch = fileContent.match(/\*\*日付\*\*:\s*(.+)$/m);
    const date = dateMatch ? dateMatch[1].trim() : "";

    return {
      filePath,
      title,
      status,
      date,
      content: fileContent,
    };
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error);
    return null;
  }
}

/**
 * 同じカテゴリに属するか判定
 */
function isSameCategory(
  newKeywords: string[],
  existingContent: string,
): { match: boolean; category: string } {
  const lowerContent = existingContent.toLowerCase();

  for (const [category, keywords] of Object.entries(TECHNOLOGY_CATEGORIES)) {
    const newHasCategory = newKeywords.some((kw) =>
      keywords.some((catKw) => kw.toLowerCase().includes(catKw)),
    );
    const existingHasCategory = keywords.some((catKw) =>
      lowerContent.includes(catKw),
    );

    if (newHasCategory && existingHasCategory) {
      return { match: true, category };
    }
  }

  return { match: false, category: "" };
}

/**
 * 競合パターンを検出
 */
function detectConflictPattern(
  newKeywords: string[],
  existingContent: string,
): { hasConflict: boolean; reason: string } {
  const lowerContent = existingContent.toLowerCase();

  for (const pattern of CONFLICT_PATTERNS) {
    // 新しい決定が positive パターン、既存が negative パターン
    const newHasPositive = newKeywords.some((kw) =>
      pattern.positive.some((p) => kw.toLowerCase().includes(p)),
    );
    const existingHasNegative = pattern.negative.some((n) =>
      lowerContent.includes(n),
    );

    if (newHasPositive && existingHasNegative) {
      return {
        hasConflict: true,
        reason: `新規決定が「${pattern.positive.join("/")}」、既存決定が「${pattern.negative.join("/")}」の方向性`,
      };
    }

    // 新しい決定が negative パターン、既存が positive パターン
    const newHasNegative = newKeywords.some((kw) =>
      pattern.negative.some((n) => kw.toLowerCase().includes(n)),
    );
    const existingHasPositive = pattern.positive.some((p) =>
      lowerContent.includes(p),
    );

    if (newHasNegative && existingHasPositive) {
      return {
        hasConflict: true,
        reason: `新規決定が「${pattern.negative.join("/")}」、既存決定が「${pattern.positive.join("/")}」の方向性`,
      };
    }
  }

  return { hasConflict: false, reason: "" };
}

/**
 * 競合する決定記録を検出
 */
export function findConflicts(
  newDecisionKeywords: string[],
): ConflictingDecision[] {
  const projectRoot = process.cwd();
  const decisionsDir = path.join(projectRoot, ".context", "decisions");

  if (!fs.existsSync(decisionsDir)) {
    console.error(`Decisions directory not found: ${decisionsDir}`);
    return [];
  }

  const files = getAllDecisionFiles(decisionsDir);
  const conflicts: ConflictingDecision[] = [];

  for (const filePath of files) {
    const metadata = parseDecisionFile(filePath);
    if (!metadata) continue;

    // ステータスが「承認済み」または「実装完了」の決定のみ対象
    if (
      !metadata.status.includes("承認済み") &&
      !metadata.status.includes("実装完了")
    ) {
      continue;
    }

    const conflictReasons: string[] = [];
    let riskLevel = 0;

    // 1. 同じカテゴリに属するか
    const categoryCheck = isSameCategory(newDecisionKeywords, metadata.content);
    if (categoryCheck.match) {
      conflictReasons.push(`同じカテゴリ（${categoryCheck.category}）に属する`);
      riskLevel = Math.max(riskLevel, 1);
    }

    // 2. 競合パターンを検出
    const patternCheck = detectConflictPattern(
      newDecisionKeywords,
      metadata.content,
    );
    if (patternCheck.hasConflict) {
      conflictReasons.push(patternCheck.reason);
      riskLevel = Math.max(riskLevel, 3); // 高リスク
    }

    // 3. キーワードの完全一致（同一トピック）
    const lowerTitle = metadata.title.toLowerCase();
    const lowerContent = metadata.content.toLowerCase();
    for (const keyword of newDecisionKeywords) {
      const lowerKeyword = keyword.toLowerCase();

      if (
        lowerTitle.includes(lowerKeyword) ||
        lowerContent.includes(lowerKeyword)
      ) {
        conflictReasons.push(`キーワード「${keyword}」が含まれる`);
        riskLevel = Math.max(riskLevel, 2); // 中リスク
        break;
      }
    }

    // 競合理由がある場合のみ追加
    if (conflictReasons.length > 0) {
      conflicts.push({
        filePath: path.relative(projectRoot, filePath),
        title: metadata.title,
        status: metadata.status,
        date: metadata.date,
        conflictReasons,
        riskLevel,
      });
    }
  }

  // リスクレベル順にソート（降順）
  conflicts.sort((a, b) => b.riskLevel - a.riskLevel);

  return conflicts;
}

// CLI として実行された場合
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage: find-conflicts.ts <keyword1> [keyword2] ...");
    console.error("Example: find-conflicts.ts Convex Auth 認証 採用");
    process.exit(1);
  }

  console.log(`⚠️  Checking for conflicts with: ${args.join(", ")}\n`);

  const results = findConflicts(args);

  if (results.length === 0) {
    console.log("✅ No conflicting decisions found.");
    process.exit(0);
  }

  console.log(
    `⚠️  Found ${results.length} potentially conflicting decision(s):\n`,
  );

  for (const result of results) {
    const riskEmoji =
      result.riskLevel === 3 ? "🔴" : result.riskLevel === 2 ? "🟡" : "🟢";
    console.log(`${riskEmoji} ${result.title}`);
    console.log(`   Path: ${result.filePath}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Date: ${result.date}`);
    console.log(`   Risk Level: ${result.riskLevel}/3`);
    console.log(`   Conflict Reasons:`);
    for (const reason of result.conflictReasons) {
      console.log(`     - ${reason}`);
    }
    console.log();
  }
}
