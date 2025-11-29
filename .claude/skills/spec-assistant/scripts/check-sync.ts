#!/usr/bin/env node

import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * 同期チェックスクリプト
 * 使い方: tsx check-sync.ts
 * 変更されたファイルと関連仕様書の同期状態をチェックします
 */

interface SpecInfo {
  path: string;
  type: "feature" | "api";
  lastModified: Date;
  exists: boolean;
}

interface SyncIssue {
  severity: "error" | "warning" | "info";
  message: string;
  recommendation: string;
}

/**
 * 変更されたファイルを取得
 */
function getChangedFiles(): string[] {
  try {
    const output = execSync("git diff main...HEAD --name-only", {
      encoding: "utf-8",
    });
    return output
      .trim()
      .split("\n")
      .filter((f) => f.length > 0);
  } catch {
    // mainブランチがない場合はステージングエリアの変更を取得
    try {
      const output = execSync("git diff --name-only", { encoding: "utf-8" });
      return output
        .trim()
        .split("\n")
        .filter((f) => f.length > 0);
    } catch {
      return [];
    }
  }
}

/**
 * ファイルパスから機能名を抽出
 */
function extractFeatureName(filePath: string): string | null {
  const featuresMatch = filePath.match(/src\/features\/([^/]+)/);
  if (featuresMatch) return featuresMatch[1];

  const convexMatch = filePath.match(/convex\/([^/]+)/);
  if (convexMatch && !["_generated", "schema"].includes(convexMatch[1])) {
    return convexMatch[1];
  }

  return null;
}

/**
 * 仕様書情報を取得
 */
function getSpecInfo(featureName: string): SpecInfo[] {
  const projectRoot = process.cwd();
  const specs: SpecInfo[] = [];

  // 機能仕様書
  const featureSpecPath = path.join(
    projectRoot,
    ".context",
    "specs",
    "features",
    `${featureName}.md`,
  );
  const featureExists = fs.existsSync(featureSpecPath);
  specs.push({
    path: `.context/specs/features/${featureName}.md`,
    type: "feature",
    lastModified: featureExists
      ? fs.statSync(featureSpecPath).mtime
      : new Date(0),
    exists: featureExists,
  });

  // API仕様書
  const apiSpecPath = path.join(
    projectRoot,
    ".context",
    "specs",
    "api",
    `${featureName}-api.md`,
  );
  const apiExists = fs.existsSync(apiSpecPath);
  specs.push({
    path: `.context/specs/api/${featureName}-api.md`,
    type: "api",
    lastModified: apiExists ? fs.statSync(apiSpecPath).mtime : new Date(0),
    exists: apiExists,
  });

  return specs;
}

/**
 * 同期状態をチェック
 */
function checkSync(filePath: string, specs: SpecInfo[]): SyncIssue[] {
  const issues: SyncIssue[] = [];
  const projectRoot = process.cwd();
  const fullPath = path.join(projectRoot, filePath);

  if (!fs.existsSync(fullPath)) {
    return issues;
  }

  const fileStat = fs.statSync(fullPath);
  const fileModified = fileStat.mtime;

  for (const spec of specs) {
    if (!spec.exists) {
      issues.push({
        severity: "warning",
        message: `${spec.type === "feature" ? "機能" : "API"}仕様書が存在しません`,
        recommendation: `${spec.path} を作成してください`,
      });
      continue;
    }

    // 日数差を計算
    const daysDiff = Math.floor(
      (fileModified.getTime() - spec.lastModified.getTime()) /
        (1000 * 60 * 60 * 24),
    );

    if (daysDiff > 7) {
      issues.push({
        severity: "warning",
        message: `実装が仕様書より ${daysDiff} 日新しいです`,
        recommendation: `${spec.path} の更新を検討してください`,
      });
    } else if (daysDiff > 0) {
      issues.push({
        severity: "info",
        message: `実装が仕様書より新しいです（${daysDiff}日差）`,
        recommendation: `${spec.path} の内容を確認してください`,
      });
    }
  }

  return issues;
}

/**
 * メイン処理
 */
function main() {
  console.log("=== 仕様書同期チェック ===\n");

  const changedFiles = getChangedFiles();

  if (changedFiles.length === 0) {
    console.log("変更されたファイルがありません。");
    return;
  }

  // 機能ごとにグループ化
  const featureMap = new Map<string, string[]>();

  for (const file of changedFiles) {
    const featureName = extractFeatureName(file);
    if (featureName) {
      const files = featureMap.get(featureName) || [];
      files.push(file);
      featureMap.set(featureName, files);
    }
  }

  if (featureMap.size === 0) {
    console.log("機能に関連する変更が見つかりませんでした。");
    return;
  }

  console.log(`変更された機能: ${featureMap.size}件\n`);

  let hasIssues = false;

  for (const [featureName, files] of featureMap) {
    console.log(`📁 ${featureName}`);
    console.log(`   変更ファイル:`);
    for (const file of files.slice(0, 5)) {
      console.log(`     - ${file}`);
    }
    if (files.length > 5) {
      console.log(`     ... 他 ${files.length - 5} ファイル`);
    }

    const specs = getSpecInfo(featureName);
    console.log(`   関連仕様書:`);
    for (const spec of specs) {
      const status = spec.exists ? "✅" : "❌";
      console.log(`     ${status} ${spec.path}`);
    }

    const issues: SyncIssue[] = [];
    for (const file of files) {
      issues.push(...checkSync(file, specs));
    }

    // 重複を削除
    const uniqueIssues = issues.filter(
      (issue, index, self) =>
        index === self.findIndex((i) => i.message === issue.message),
    );

    if (uniqueIssues.length > 0) {
      hasIssues = true;
      console.log(`   問題:`);
      for (const issue of uniqueIssues) {
        const icon =
          issue.severity === "error"
            ? "🔴"
            : issue.severity === "warning"
              ? "🟡"
              : "🔵";
        console.log(`     ${icon} ${issue.message}`);
        console.log(`        → ${issue.recommendation}`);
      }
    } else {
      console.log(`   ✅ 問題なし`);
    }

    console.log("");
  }

  if (hasIssues) {
    console.log("---");
    console.log("⚠️  仕様書の更新を検討してください。");
    console.log("   CLAUDE.mdの重要ルール: 仕様書と実装は常に同期すること");
  } else {
    console.log("✅ すべての仕様書が同期されています。");
  }
}

main();
