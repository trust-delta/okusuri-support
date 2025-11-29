#!/usr/bin/env node

import * as fs from "node:fs";
import * as path from "node:path";

/**
 * 関連実装ファイル検索スクリプト
 * 使い方: tsx spec-find-impl.ts <機能名> [最大件数]
 * 例: tsx spec-find-impl.ts medication 5
 * 例: tsx spec-find-impl.ts group 3
 */

interface FileResult {
  path: string;
  size: number;
  lines: number;
  summary: string[];
}

/**
 * ファイルサイズを人間に読みやすい形式に変換
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes}B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)}KB`;
  }
  return `${Math.round(bytes / (1024 * 1024))}MB`;
}

/**
 * 文字列のケース変換
 */
function toKebabCase(str: string): string {
  return str.replace(/_/g, "-").toLowerCase();
}

function toCamelCase(str: string): string {
  return str.replace(/([-_][a-z])/g, (group) =>
    group.toUpperCase().replace("-", "").replace("_", ""),
  );
}

function toPascalCase(str: string): string {
  const camel = toCamelCase(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

/**
 * TypeScript/TSXファイルを検索
 */
function findTsFiles(
  dir: string,
  excludeDirs: string[] = ["node_modules", ".next", "dist", "_generated"],
): string[] {
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
      } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
        files.push(fullPath);
      }
    }
  }

  traverse(dir);
  return files;
}

/**
 * ファイルの概要を取得
 */
function getFileSummary(filePath: string): string[] {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n").slice(0, 20);
    const summaryLines: string[] = [];

    for (const line of lines) {
      if (/^(\/\/|\/\*|\*|export)/.test(line.trim())) {
        summaryLines.push(line.trim());
        if (summaryLines.length >= 3) break;
      }
    }

    return summaryLines;
  } catch {
    return [];
  }
}

/**
 * 関連実装ファイルを検索
 */
export function findImplementation(featureName: string, maxCount: number): FileResult[] {
  const projectRoot = process.cwd();
  const results: FileResult[] = [];
  const foundPaths = new Set<string>();

  const featureKebab = toKebabCase(featureName);
  const featureCamel = toCamelCase(featureName);
  const featurePascal = toPascalCase(featureName);

  // 優先検索ディレクトリ
  const priorityDirs = [
    path.join(projectRoot, "src", "features", featureName),
    path.join(projectRoot, "convex", featureName),
    path.join(projectRoot, "src", "components", featureName),
  ];

  // 優先ディレクトリを検索
  for (const dir of priorityDirs) {
    if (fs.existsSync(dir)) {
      const files = findTsFiles(dir);
      for (const file of files) {
        if (!foundPaths.has(file)) {
          foundPaths.add(file);
          const stat = fs.statSync(file);
          const content = fs.readFileSync(file, "utf-8");
          results.push({
            path: path.relative(projectRoot, file),
            size: stat.size,
            lines: content.split("\n").length,
            summary: getFileSummary(file),
          });
        }
      }
    }
  }

  // src/ 配下で機能名を含むファイルを検索
  const srcDir = path.join(projectRoot, "src");
  if (fs.existsSync(srcDir)) {
    const allSrcFiles = findTsFiles(srcDir);
    for (const file of allSrcFiles) {
      const fileName = path.basename(file).toLowerCase();
      if (
        fileName.includes(featureName.toLowerCase()) ||
        fileName.includes(featureKebab) ||
        fileName.includes(featureCamel.toLowerCase())
      ) {
        if (!foundPaths.has(file)) {
          foundPaths.add(file);
          const stat = fs.statSync(file);
          const content = fs.readFileSync(file, "utf-8");
          results.push({
            path: path.relative(projectRoot, file),
            size: stat.size,
            lines: content.split("\n").length,
            summary: getFileSummary(file),
          });
        }
      }
    }
  }

  // convex/ 配下で機能名を含むファイルを検索
  const convexDir = path.join(projectRoot, "convex");
  if (fs.existsSync(convexDir)) {
    const allConvexFiles = findTsFiles(convexDir);
    for (const file of allConvexFiles) {
      const fileName = path.basename(file).toLowerCase();
      if (
        fileName.includes(featureName.toLowerCase()) ||
        fileName.includes(featureKebab) ||
        fileName.includes(featureCamel.toLowerCase())
      ) {
        if (!foundPaths.has(file)) {
          foundPaths.add(file);
          const stat = fs.statSync(file);
          const content = fs.readFileSync(file, "utf-8");
          results.push({
            path: path.relative(projectRoot, file),
            size: stat.size,
            lines: content.split("\n").length,
            summary: getFileSummary(file),
          });
        }
      }
    }
  }

  return results.slice(0, maxCount);
}

// CLI として実行された場合
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("エラー: 機能名を指定してください。");
    console.error("使い方: tsx spec-find-impl.ts <機能名> [最大件数]");
    process.exit(1);
  }

  const featureName = args[0];
  const maxCount = parseInt(args[1] || "5", 10);

  console.log("=== 関連実装ファイル検索 ===");
  console.log(`機能名: ${featureName}`);
  console.log(`最大件数: ${maxCount}`);
  console.log("");

  console.log("検索バリエーション:");
  console.log(`  - オリジナル: ${featureName}`);
  console.log(`  - kebab-case: ${toKebabCase(featureName)}`);
  console.log(`  - camelCase: ${toCamelCase(featureName)}`);
  console.log(`  - PascalCase: ${toPascalCase(featureName)}`);
  console.log("");

  const results = findImplementation(featureName, maxCount);

  if (results.length === 0) {
    console.log("該当する実装ファイルが見つかりませんでした。");
    console.log("");
    console.log("確認事項:");
    console.log("  - 機能名が正しいか確認してください");
    console.log("  - src/features/ または convex/ 配下にディレクトリが存在するか確認してください");
    process.exit(0);
  }

  console.log(`=== 検索結果（最大 ${maxCount} 件） ===`);
  for (const file of results) {
    console.log(`📄 ${file.path}`);
    console.log(`   サイズ: ${formatSize(file.size)}, 行数: ${file.lines}`);
    if (file.summary.length > 0) {
      for (const line of file.summary) {
        console.log(`   ${line}`);
      }
    }
    console.log("");
  }
}
