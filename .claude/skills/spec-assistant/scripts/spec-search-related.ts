#!/usr/bin/env node

import * as fs from "node:fs";
import * as path from "node:path";

/**
 * 関連ドキュメント検索スクリプト
 * 使い方: tsx spec-search-related.ts <キーワード1> [キーワード2] [...]
 * 例: tsx spec-search-related.ts notification
 * 例: tsx spec-search-related.ts medication group
 */

interface SearchResult {
  filePath: string;
  title: string;
  matchCount: number;
}

/**
 * ディレクトリ内の.mdファイルを再帰的に取得
 */
function getMdFiles(dir: string, excludeDirs: string[] = ["node_modules", ".git"]): string[] {
  const files: string[] = [];

  function traverse(currentDir: string) {
    if (!fs.existsSync(currentDir)) {
      return;
    }

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (!excludeDirs.includes(entry.name)) {
          traverse(fullPath);
        }
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        files.push(fullPath);
      }
    }
  }

  traverse(dir);
  return files;
}

/**
 * ファイルからタイトルを抽出
 */
function extractTitle(content: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "タイトルなし";
}

/**
 * キーワードのマッチ数をカウント
 */
function countMatches(content: string, keywords: string[]): number {
  let count = 0;
  const lowerContent = content.toLowerCase();

  for (const keyword of keywords) {
    const regex = new RegExp(keyword.toLowerCase(), "gi");
    const matches = lowerContent.match(regex);
    if (matches) {
      count += matches.length;
    }
  }

  return count;
}

/**
 * 関連ドキュメントを検索
 */
export function searchRelated(keywords: string[]): SearchResult[] {
  const projectRoot = process.cwd();
  const contextDir = path.join(projectRoot, ".context");

  if (!fs.existsSync(contextDir)) {
    console.error(`エラー: .contextディレクトリが見つかりません: ${contextDir}`);
    return [];
  }

  const files = getMdFiles(contextDir);
  const results: SearchResult[] = [];

  for (const filePath of files) {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const matchCount = countMatches(content, keywords);

      if (matchCount > 0) {
        results.push({
          filePath: path.relative(projectRoot, filePath),
          title: extractTitle(content),
          matchCount,
        });
      }
    } catch {
      // ファイル読み込みエラーは無視
    }
  }

  // マッチ数でソート（降順）
  results.sort((a, b) => b.matchCount - a.matchCount);

  return results;
}

// CLI として実行された場合
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("エラー: 検索キーワードを指定してください。");
    console.error("使い方: tsx spec-search-related.ts <キーワード1> [キーワード2] [...]");
    process.exit(1);
  }

  console.log("=== 関連ドキュメント検索 ===");
  console.log(`キーワード: ${args.join(", ")}`);
  console.log("");

  const results = searchRelated(args);

  if (results.length === 0) {
    console.log("該当するドキュメントが見つかりませんでした。");
    process.exit(0);
  }

  console.log("=== 検索結果 ===");
  for (const result of results) {
    console.log(`📄 ${result.filePath}`);
    console.log(`   タイトル: ${result.title}`);
    console.log(`   マッチ数: ${result.matchCount}`);
    console.log("");
  }
}
