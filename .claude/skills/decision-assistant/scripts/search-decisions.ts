#!/usr/bin/env node

import * as fs from "node:fs";
import * as path from "node:path";
import matter from "gray-matter";

/**
 * 決定記録の検索結果
 */
interface DecisionMatch {
  /** ファイルパス */
  filePath: string;
  /** タイトル */
  title: string;
  /** ステータス */
  status: string;
  /** 日付 */
  date: string;
  /** マッチスコア (高いほど関連度が高い) */
  score: number;
  /** マッチした理由 */
  matchReasons: string[];
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
 * 決定記録ディレクトリから全ファイルを取得
 */
function getAllDecisionFiles(decisionsDir: string): string[] {
  const files: string[] = [];

  function traverse(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // templates ディレクトリはスキップ
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
 * 決定記録ファイルをパースしてメタデータを抽出
 */
function parseDecisionFile(filePath: string): DecisionMetadata | null {
  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const parsed = matter(fileContent);

    // タイトルを抽出（最初の # 見出し）
    const titleMatch = fileContent.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].replace(/^決定記録:\s*/, "") : "";

    // ステータスを抽出
    const statusMatch = fileContent.match(/\*\*ステータス\*\*:\s*(.+)$/m);
    const status = statusMatch ? statusMatch[1].trim() : "";

    // 日付を抽出
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
 * キーワードとのマッチ度をスコアリング
 */
function calculateScore(
  metadata: DecisionMetadata,
  keywords: string[],
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  const lowerTitle = metadata.title.toLowerCase();
  const lowerContent = metadata.content.toLowerCase();

  for (const keyword of keywords) {
    const lowerKeyword = keyword.toLowerCase();

    // タイトルでの完全一致（最高スコア）
    if (lowerTitle === lowerKeyword) {
      score += 100;
      reasons.push(`タイトルが完全一致: "${keyword}"`);
      continue;
    }

    // タイトルでの部分一致（高スコア）
    if (lowerTitle.includes(lowerKeyword)) {
      score += 50;
      reasons.push(`タイトルに含まれる: "${keyword}"`);
    }

    // コンテンツでの頻出度（中スコア）
    const contentMatches = (
      lowerContent.match(new RegExp(lowerKeyword, "g")) || []
    ).length;
    if (contentMatches > 0) {
      score += contentMatches * 5;
      reasons.push(`本文に${contentMatches}回出現: "${keyword}"`);
    }

    // ファイル名での一致（中スコア）
    const fileName = path.basename(metadata.filePath, ".md").toLowerCase();
    if (fileName.includes(lowerKeyword)) {
      score += 30;
      reasons.push(`ファイル名に含まれる: "${keyword}"`);
    }
  }

  return { score, reasons };
}

/**
 * 既存の決定記録を検索
 */
export function searchDecisions(keywords: string[]): DecisionMatch[] {
  const projectRoot = process.cwd();
  const decisionsDir = path.join(projectRoot, ".context", "decisions");

  if (!fs.existsSync(decisionsDir)) {
    console.error(`Decisions directory not found: ${decisionsDir}`);
    return [];
  }

  const files = getAllDecisionFiles(decisionsDir);
  const matches: DecisionMatch[] = [];

  for (const filePath of files) {
    const metadata = parseDecisionFile(filePath);
    if (!metadata) continue;

    const { score, reasons } = calculateScore(metadata, keywords);

    if (score > 0) {
      matches.push({
        filePath: path.relative(projectRoot, filePath),
        title: metadata.title,
        status: metadata.status,
        date: metadata.date,
        score,
        matchReasons: reasons,
      });
    }
  }

  // スコア順にソート（降順）
  matches.sort((a, b) => b.score - a.score);

  return matches;
}

// CLI として実行された場合
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage: search-decisions.ts <keyword1> [keyword2] ...");
    console.error("Example: search-decisions.ts 認証 Convex Auth");
    process.exit(1);
  }

  console.log(`🔍 Searching for: ${args.join(", ")}\n`);

  const results = searchDecisions(args);

  if (results.length === 0) {
    console.log("❌ No matching decisions found.");
    process.exit(0);
  }

  console.log(`✅ Found ${results.length} matching decision(s):\n`);

  for (const result of results) {
    console.log(`📄 ${result.title}`);
    console.log(`   Path: ${result.filePath}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Date: ${result.date}`);
    console.log(`   Score: ${result.score}`);
    console.log(`   Reasons:`);
    for (const reason of result.matchReasons) {
      console.log(`     - ${reason}`);
    }
    console.log();
  }
}
