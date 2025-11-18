#!/usr/bin/env node

import * as fs from "node:fs";
import * as path from "node:path";
import matter from "gray-matter";

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
 * ステータス別の統計
 */
interface StatusStats {
	承認済み: number;
	提案中: number;
	却下: number;
	廃止: number;
	実装完了: number;
	その他: number;
}

/**
 * カテゴリ別の統計
 */
interface CategoryStats {
	[category: string]: number;
}

/**
 * 月別の統計
 */
interface MonthlyStats {
	[month: string]: number;
}

/**
 * 技術スタック・カテゴリのキーワード
 */
const TECHNOLOGY_CATEGORIES = {
	auth: ["認証", "auth", "clerk", "convex auth", "supabase auth", "nextauth"],
	ui: ["ui", "shadcn", "radix", "material-ui", "ant design", "chakra"],
	form: ["フォーム", "form", "react-hook-form", "formik", "tanstack form"],
	package: ["パッケージマネージャ", "package manager", "npm", "pnpm", "yarn", "bun"],
	framework: ["フレームワーク", "framework", "next.js", "react", "vue", "svelte"],
	database: ["データベース", "database", "convex", "supabase", "postgresql", "mongodb"],
	testing: ["テスト", "testing", "vitest", "jest", "playwright", "cypress"],
	statistics: ["統計", "statistics", "服薬", "medication", "処方", "prescription"],
	group: ["グループ", "group", "脱退", "削除", "leave", "delete"],
	development: ["開発", "development", "コンテキスト", "context", "スキル", "skill"],
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
		const parsed = matter(fileContent);

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
 * カテゴリを判定
 */
function detectCategories(content: string): string[] {
	const lowerContent = content.toLowerCase();
	const categories: string[] = [];

	for (const [category, keywords] of Object.entries(TECHNOLOGY_CATEGORIES)) {
		if (keywords.some((kw) => lowerContent.includes(kw))) {
			categories.push(category);
		}
	}

	return categories;
}

/**
 * 月を抽出（YYYY-MM形式）
 */
function extractMonth(date: string): string | null {
	// "2025年10月26日" → "2025-10"
	const match = date.match(/(\d{4})年(\d{1,2})月/);
	if (match) {
		const year = match[1];
		const month = match[2].padStart(2, "0");
		return `${year}-${month}`;
	}
	return null;
}

/**
 * 決定記録の統計を生成
 */
export function generateStats(): void {
	const projectRoot = process.cwd();
	const decisionsDir = path.join(projectRoot, ".context", "decisions");

	if (!fs.existsSync(decisionsDir)) {
		console.error(`Decisions directory not found: ${decisionsDir}`);
		process.exit(1);
	}

	const files = getAllDecisionFiles(decisionsDir);
	const decisions: DecisionMetadata[] = [];

	for (const filePath of files) {
		const metadata = parseDecisionFile(filePath);
		if (metadata) {
			decisions.push(metadata);
		}
	}

	// 統計の初期化
	const statusStats: StatusStats = {
		承認済み: 0,
		提案中: 0,
		却下: 0,
		廃止: 0,
		実装完了: 0,
		その他: 0,
	};

	const categoryStats: CategoryStats = {};
	const monthlyStats: MonthlyStats = {};
	const deprecatedDecisions: DecisionMetadata[] = [];

	// 統計の集計
	for (const decision of decisions) {
		// ステータス別
		if (decision.status.includes("承認済み")) {
			statusStats.承認済み++;
		} else if (decision.status.includes("提案中")) {
			statusStats.提案中++;
		} else if (decision.status.includes("却下")) {
			statusStats.却下++;
		} else if (decision.status.includes("廃止")) {
			statusStats.廃止++;
			deprecatedDecisions.push(decision);
		} else if (decision.status.includes("実装完了")) {
			statusStats.実装完了++;
		} else {
			statusStats.その他++;
		}

		// カテゴリ別
		const categories = detectCategories(decision.content);
		for (const category of categories) {
			categoryStats[category] = (categoryStats[category] || 0) + 1;
		}

		// 月別
		const month = extractMonth(decision.date);
		if (month) {
			monthlyStats[month] = (monthlyStats[month] || 0) + 1;
		}
	}

	// 統計の出力
	console.log("📊 決定記録統計\n");
	console.log(`総数: ${decisions.length}件\n`);

	console.log("━━━ ステータス別 ━━━");
	console.log(`✅ 承認済み:     ${statusStats.承認済み}件`);
	console.log(`✅ 実装完了:     ${statusStats.実装完了}件`);
	console.log(`⏳ 提案中:       ${statusStats.提案中}件`);
	console.log(`❌ 却下:         ${statusStats.却下}件`);
	console.log(`🗑️  廃止:         ${statusStats.廃止}件`);
	if (statusStats.その他 > 0) {
		console.log(`❓ その他:       ${statusStats.その他}件`);
	}
	console.log();

	console.log("━━━ カテゴリ別 ━━━");
	const sortedCategories = Object.entries(categoryStats).sort((a, b) => b[1] - a[1]);
	for (const [category, count] of sortedCategories) {
		console.log(`${category.padEnd(15)}: ${count}件`);
	}
	console.log();

	console.log("━━━ 月別トレンド ━━━");
	const sortedMonths = Object.entries(monthlyStats).sort((a, b) => a[0].localeCompare(b[0]));
	for (const [month, count] of sortedMonths) {
		const bar = "█".repeat(count);
		console.log(`${month}: ${bar} ${count}件`);
	}
	console.log();

	// 廃止された決定
	if (deprecatedDecisions.length > 0) {
		console.log("━━━ 廃止された決定 ━━━");
		for (const decision of deprecatedDecisions) {
			console.log(`🗑️  ${decision.title}`);
			console.log(`   ${path.relative(projectRoot, decision.filePath)}`);
			console.log(`   廃止日: ${decision.date}`);
			console.log();
		}
	}

	// 提案中のままの決定（注意喚起）
	if (statusStats.提案中 > 0) {
		console.log("━━━ ⚠️  提案中のままの決定（要確認） ━━━");
		for (const decision of decisions) {
			if (decision.status.includes("提案中")) {
				console.log(`⏳ ${decision.title}`);
				console.log(`   ${path.relative(projectRoot, decision.filePath)}`);
				console.log(`   提案日: ${decision.date}`);
				console.log();
			}
		}
	}
}

// CLI として実行された場合
if (require.main === module) {
	generateStats();
}
