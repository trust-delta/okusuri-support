#!/usr/bin/env node

import * as fs from "node:fs";
import * as path from "node:path";

/**
 * 関連仕様書検索スクリプト
 * 使い方: tsx find-related-specs.ts <実装ファイルパス>
 * 例: tsx find-related-specs.ts src/features/medication/components/List.tsx
 */

interface SpecFile {
  path: string;
  type: "feature" | "api";
  lastModified: Date;
}

/**
 * ファイルパスから機能名を抽出
 */
function extractFeatureName(filePath: string): string | null {
  // src/features/<name>/... パターン
  const featuresMatch = filePath.match(/src\/features\/([^/]+)/);
  if (featuresMatch) {
    return featuresMatch[1];
  }

  // convex/<name>/... パターン
  const convexMatch = filePath.match(/convex\/([^/]+)/);
  if (convexMatch && !["_generated", "schema"].includes(convexMatch[1])) {
    return convexMatch[1];
  }

  // src/components/<name>/... パターン
  const componentsMatch = filePath.match(/src\/components\/([^/]+)/);
  if (componentsMatch) {
    return componentsMatch[1];
  }

  return null;
}

/**
 * 機能名から関連する仕様書を検索
 */
function findRelatedSpecs(featureName: string): SpecFile[] {
  const projectRoot = process.cwd();
  const specs: SpecFile[] = [];

  // 機能仕様書
  const featureSpecPath = path.join(
    projectRoot,
    ".context",
    "specs",
    "features",
    `${featureName}.md`,
  );
  if (fs.existsSync(featureSpecPath)) {
    const stat = fs.statSync(featureSpecPath);
    specs.push({
      path: path.relative(projectRoot, featureSpecPath),
      type: "feature",
      lastModified: stat.mtime,
    });
  }

  // API仕様書
  const apiSpecPath = path.join(projectRoot, ".context", "specs", "api", `${featureName}-api.md`);
  if (fs.existsSync(apiSpecPath)) {
    const stat = fs.statSync(apiSpecPath);
    specs.push({
      path: path.relative(projectRoot, apiSpecPath),
      type: "api",
      lastModified: stat.mtime,
    });
  }

  return specs;
}

/**
 * 実装ファイルの関連仕様書を検索
 */
export function findSpecsForFile(filePath: string): SpecFile[] {
  const featureName = extractFeatureName(filePath);
  if (!featureName) {
    return [];
  }

  return findRelatedSpecs(featureName);
}

// CLI として実行された場合
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("エラー: 実装ファイルパスを指定してください。");
    console.error("使い方: tsx find-related-specs.ts <ファイルパス>");
    process.exit(1);
  }

  const filePath = args[0];
  const featureName = extractFeatureName(filePath);

  if (!featureName) {
    console.log("指定されたファイルから機能名を特定できませんでした。");
    process.exit(0);
  }

  console.log(`=== 関連仕様書検索 ===`);
  console.log(`ファイル: ${filePath}`);
  console.log(`機能名: ${featureName}`);
  console.log("");

  const specs = findSpecsForFile(filePath);

  if (specs.length === 0) {
    console.log("関連する仕様書が見つかりませんでした。");
    console.log("");
    console.log("推奨アクション:");
    console.log(`  - 機能仕様書を作成: .context/specs/features/${featureName}.md`);
    console.log(`  - API仕様書を作成: .context/specs/api/${featureName}-api.md`);
    process.exit(0);
  }

  console.log("=== 検索結果 ===");
  for (const spec of specs) {
    console.log(`📄 ${spec.path}`);
    console.log(`   タイプ: ${spec.type === "feature" ? "機能仕様" : "API仕様"}`);
    console.log(`   最終更新: ${spec.lastModified.toISOString().split("T")[0]}`);
    console.log("");
  }
}
