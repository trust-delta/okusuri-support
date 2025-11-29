#!/usr/bin/env node

import * as fs from "node:fs";
import * as path from "node:path";

/**
 * 最新仕様書一覧取得スクリプト
 * 使い方: tsx spec-list-recent.ts [件数] [タイプ]
 * 例: tsx spec-list-recent.ts 5 features
 * 例: tsx spec-list-recent.ts 3 api
 */

type SpecType = "features" | "api" | "all";

interface FileInfo {
  path: string;
  mtime: Date;
}

/**
 * ディレクトリ内の.mdファイルを再帰的に取得
 */
function getMdFiles(dir: string, excludeDirs: string[] = ["templates"]): FileInfo[] {
  const files: FileInfo[] = [];

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
        const stat = fs.statSync(fullPath);
        files.push({
          path: fullPath,
          mtime: stat.mtime,
        });
      }
    }
  }

  traverse(dir);
  return files;
}

/**
 * 最新の仕様書一覧を取得
 */
export function listRecentSpecs(count: number, type: SpecType): string[] {
  const projectRoot = process.cwd();
  const specsDir = path.join(projectRoot, ".context", "specs");

  let searchDir: string;

  switch (type) {
    case "features":
      searchDir = path.join(specsDir, "features");
      break;
    case "api":
      searchDir = path.join(specsDir, "api");
      break;
    case "all":
      searchDir = specsDir;
      break;
  }

  if (!fs.existsSync(searchDir)) {
    console.error(`エラー: ディレクトリが見つかりません: ${searchDir}`);
    return [];
  }

  const files = getMdFiles(searchDir);

  // 更新日時の新しい順にソート
  files.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  // 指定件数分取得
  return files.slice(0, count).map((f) => path.relative(projectRoot, f.path));
}

// CLI として実行された場合
if (require.main === module) {
  const args = process.argv.slice(2);
  const count = parseInt(args[0] || "5", 10);
  const type = (args[1] || "all") as SpecType;

  if (!["features", "api", "all"].includes(type)) {
    console.error("エラー: 不正なタイプです。'features', 'api', または 'all' を指定してください。");
    process.exit(1);
  }

  const results = listRecentSpecs(count, type);

  if (results.length === 0) {
    console.log("該当する仕様書が見つかりませんでした。");
    process.exit(0);
  }

  for (const file of results) {
    console.log(file);
  }
}
