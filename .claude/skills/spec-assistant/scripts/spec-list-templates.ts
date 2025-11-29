#!/usr/bin/env node

import * as fs from "node:fs";
import * as path from "node:path";

/**
 * テンプレート一覧取得スクリプト
 * 使い方: tsx spec-list-templates.ts [タイプ]
 * 例: tsx spec-list-templates.ts feature
 * 例: tsx spec-list-templates.ts api
 */

type TemplateType = "feature" | "api" | "all";

/**
 * テンプレート一覧を取得
 */
export function listTemplates(type: TemplateType): string[] {
  const projectRoot = process.cwd();
  const templatesDir = path.join(projectRoot, ".context", "specs", "templates");

  if (!fs.existsSync(templatesDir)) {
    console.error(`エラー: テンプレートディレクトリが見つかりません: ${templatesDir}`);
    return [];
  }

  const entries = fs.readdirSync(templatesDir, { withFileTypes: true });
  const templates: string[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) {
      continue;
    }

    const fullPath = path.join(templatesDir, entry.name);
    const fileName = entry.name.toLowerCase();

    switch (type) {
      case "feature":
        if (fileName.includes("feature")) {
          templates.push(path.relative(projectRoot, fullPath));
        }
        break;
      case "api":
        if (fileName.includes("api")) {
          templates.push(path.relative(projectRoot, fullPath));
        }
        break;
      case "all":
        templates.push(path.relative(projectRoot, fullPath));
        break;
    }
  }

  return templates;
}

// CLI として実行された場合
if (require.main === module) {
  const args = process.argv.slice(2);
  const type = (args[0] || "all") as TemplateType;

  if (!["feature", "api", "all"].includes(type)) {
    console.error("エラー: 不正なタイプです。'feature', 'api', または 'all' を指定してください。");
    process.exit(1);
  }

  const results = listTemplates(type);

  if (results.length === 0) {
    console.log("該当するテンプレートが見つかりませんでした。");
    process.exit(0);
  }

  for (const file of results) {
    console.log(file);
  }
}
