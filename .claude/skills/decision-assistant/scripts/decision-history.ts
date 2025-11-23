#!/usr/bin/env node

import * as fs from "node:fs";
import * as path from "node:path";
import matter from "gray-matter";

/**
 * 決定記録のメタデータ
 */
interface DecisionMetadata {
  filePath: string;
  fileName: string;
  title: string;
  status: string;
  date: string;
  content: string;
  relatedDocs: string[];
}

/**
 * 履歴チェーン
 */
interface HistoryChain {
  current: DecisionMetadata;
  predecessors: DecisionMetadata[]; // この決定より前の関連決定
  successors: DecisionMetadata[]; // この決定の後に続く関連決定
  deprecated: DecisionMetadata[]; // この決定により廃止された決定
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

    // 関連ドキュメントセクションから参照を抽出
    const relatedDocsSection = fileContent.match(
      /##\s+関連ドキュメント[\s\S]*?(?=##|$)/,
    )?.[0];
    const relatedDocs: string[] = [];
    if (relatedDocsSection) {
      const linkMatches = relatedDocsSection.matchAll(/\[.*?\]\((.*?)\)/g);
      for (const match of linkMatches) {
        relatedDocs.push(match[1]);
      }
    }

    return {
      filePath,
      fileName: path.basename(filePath, ".md"),
      title,
      status,
      date,
      content: fileContent,
      relatedDocs,
    };
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error);
    return null;
  }
}

/**
 * 廃止理由から後続決定を抽出
 */
function extractSuccessorFromDeprecation(content: string): string | null {
  // "廃止理由: YYYY-MM-DD-xxx.md により置き換え" のようなパターンを検索
  const match = content.match(/廃止理由.*?([\d-]+\.md)/);
  if (match) {
    return match[1];
  }
  return null;
}

/**
 * 本文から言及されている決定ファイルを抽出
 */
function extractMentionedDecisions(content: string): string[] {
  const mentions: string[] = [];
  // `.context/decisions/YYYY-MM-DD-xxx.md` のようなパターンを検索
  const matches = content.matchAll(/\.context\/decisions\/([\d-]+\.md)/g);
  for (const match of matches) {
    mentions.push(match[1]);
  }
  return mentions;
}

/**
 * 決定記録の履歴チェーンを構築
 */
export function buildHistoryChain(targetFileName: string): HistoryChain | null {
  const projectRoot = process.cwd();
  const decisionsDir = path.join(projectRoot, ".context", "decisions");

  if (!fs.existsSync(decisionsDir)) {
    console.error(`Decisions directory not found: ${decisionsDir}`);
    return null;
  }

  const files = getAllDecisionFiles(decisionsDir);
  const allDecisions: DecisionMetadata[] = [];

  for (const filePath of files) {
    const metadata = parseDecisionFile(filePath);
    if (metadata) {
      allDecisions.push(metadata);
    }
  }

  // 対象の決定を見つける
  const current = allDecisions.find((d) => d.fileName === targetFileName);
  if (!current) {
    console.error(`Decision not found: ${targetFileName}`);
    return null;
  }

  const predecessors: DecisionMetadata[] = [];
  const successors: DecisionMetadata[] = [];
  const deprecated: DecisionMetadata[] = [];

  // 前任者を探す（関連ドキュメントや言及から）
  const mentionedDecisions = extractMentionedDecisions(current.content);
  for (const mention of mentionedDecisions) {
    const predecessor = allDecisions.find(
      (d) => d.fileName === mention.replace(".md", ""),
    );
    if (predecessor) {
      predecessors.push(predecessor);
    }
  }

  // 後続決定を探す（他の決定から現在の決定への参照）
  for (const decision of allDecisions) {
    if (decision.fileName === current.fileName) continue;

    const mentions = extractMentionedDecisions(decision.content);
    if (mentions.some((m) => m.replace(".md", "") === current.fileName)) {
      successors.push(decision);
    }
  }

  // 廃止された決定を探す（現在の決定により廃止されたもの）
  if (current.content.includes("廃止")) {
    for (const decision of allDecisions) {
      if (decision.status.includes("廃止")) {
        const successor = extractSuccessorFromDeprecation(decision.content);
        if (successor && successor.replace(".md", "") === current.fileName) {
          deprecated.push(decision);
        }
      }
    }
  }

  return {
    current,
    predecessors,
    successors,
    deprecated,
  };
}

/**
 * 履歴チェーンを表示
 */
export function displayHistoryChain(targetFileName: string): void {
  const chain = buildHistoryChain(targetFileName);
  if (!chain) {
    process.exit(1);
  }

  const _projectRoot = process.cwd();

  console.log("📜 決定記録の履歴\n");
  console.log(`━━━ 現在の決定 ━━━`);
  console.log(`📄 ${chain.current.title}`);
  console.log(`   ファイル: ${chain.current.fileName}.md`);
  console.log(`   ステータス: ${chain.current.status}`);
  console.log(`   日付: ${chain.current.date}`);
  console.log();

  // 前任者（この決定より前の関連決定）
  if (chain.predecessors.length > 0) {
    console.log("━━━ ⬆️  関連する過去の決定 ━━━");
    for (const predecessor of chain.predecessors) {
      console.log(`📌 ${predecessor.title}`);
      console.log(`   ファイル: ${predecessor.fileName}.md`);
      console.log(`   ステータス: ${predecessor.status}`);
      console.log(`   日付: ${predecessor.date}`);
      console.log();
    }
  }

  // 廃止された決定
  if (chain.deprecated.length > 0) {
    console.log("━━━ 🗑️  この決定により廃止された決定 ━━━");
    for (const dep of chain.deprecated) {
      console.log(`❌ ${dep.title}`);
      console.log(`   ファイル: ${dep.fileName}.md`);
      console.log(`   廃止日: ${dep.date}`);
      console.log();
    }
  }

  // 後続決定（この決定の後に続く関連決定）
  if (chain.successors.length > 0) {
    console.log("━━━ ⬇️  この決定に続く関連決定 ━━━");
    for (const successor of chain.successors) {
      console.log(`🔜 ${successor.title}`);
      console.log(`   ファイル: ${successor.fileName}.md`);
      console.log(`   ステータス: ${successor.status}`);
      console.log(`   日付: ${successor.date}`);
      console.log();
    }
  }

  // サマリー
  console.log("━━━ サマリー ━━━");
  console.log(`関連する過去の決定: ${chain.predecessors.length}件`);
  console.log(`廃止された決定: ${chain.deprecated.length}件`);
  console.log(`後続の関連決定: ${chain.successors.length}件`);
  console.log(
    `合計関連決定: ${chain.predecessors.length + chain.successors.length + chain.deprecated.length}件`,
  );
}

// CLI として実行された場合
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage: decision-history.ts <decision-file-name>");
    console.error(
      "Example: decision-history.ts 2025-11-16-claude-code-skills-adoption",
    );
    process.exit(1);
  }

  const targetFileName = args[0].replace(/\.md$/, ""); // .md を削除
  displayHistoryChain(targetFileName);
}
