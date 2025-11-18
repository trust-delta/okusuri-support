#!/usr/bin/env node

import * as fs from "node:fs";
import * as path from "node:path";
import matter from "gray-matter";

/**
 * 関連する決定記録
 */
interface RelatedDecision {
	/** ファイルパス */
	filePath: string;
	/** タイトル */
	title: string;
	/** ステータス */
	status: string;
	/** 日付 */
	date: string;
	/** 関連理由 */
	relationReasons: string[];
	/** 関連度スコア (高いほど関連が強い) */
	relationScore: number;
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
	relatedDocs: string[];
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
 * 関連度を計算
 */
function calculateRelation(
	newKeywords: string[],
	newCategories: string[],
	existing: DecisionMetadata,
): { score: number; reasons: string[] } {
	let score = 0;
	const reasons: string[] = [];

	const existingCategories = detectCategories(existing.content);
	const lowerContent = existing.content.toLowerCase();

	// 1. カテゴリの一致（高スコア）
	const matchingCategories = newCategories.filter((cat) => existingCategories.includes(cat));
	if (matchingCategories.length > 0) {
		score += matchingCategories.length * 30;
		reasons.push(`同じカテゴリ: ${matchingCategories.join(", ")}`);
	}

	// 2. キーワードの一致（中スコア）
	for (const keyword of newKeywords) {
		const lowerKeyword = keyword.toLowerCase();

		if (existing.title.toLowerCase().includes(lowerKeyword)) {
			score += 20;
			reasons.push(`タイトルに「${keyword}」が含まれる`);
		} else if (lowerContent.includes(lowerKeyword)) {
			score += 10;
			reasons.push(`本文に「${keyword}」が含まれる`);
		}
	}

	// 3. 相互参照（高スコア）
	// ※ 新しい決定の参照情報はまだないため、既存決定からの参照のみチェック
	// （実際の運用では、新決定作成後に相互参照を確認する）

	// 4. 日付の近さ（低スコア、ボーナス）
	// ※ 簡易実装のため省略（将来的に追加可能）

	return { score, reasons };
}

/**
 * 関連する決定記録を検索
 */
export function findRelated(newDecisionKeywords: string[]): RelatedDecision[] {
	const projectRoot = process.cwd();
	const decisionsDir = path.join(projectRoot, ".context", "decisions");

	if (!fs.existsSync(decisionsDir)) {
		console.error(`Decisions directory not found: ${decisionsDir}`);
		return [];
	}

	const files = getAllDecisionFiles(decisionsDir);
	const related: RelatedDecision[] = [];

	// 新しい決定のカテゴリを推定
	const newDecisionText = newDecisionKeywords.join(" ");
	const newCategories = detectCategories(newDecisionText);

	for (const filePath of files) {
		const metadata = parseDecisionFile(filePath);
		if (!metadata) continue;

		const { score, reasons } = calculateRelation(newDecisionKeywords, newCategories, metadata);

		if (score > 0) {
			related.push({
				filePath: path.relative(projectRoot, filePath),
				title: metadata.title,
				status: metadata.status,
				date: metadata.date,
				relationReasons: reasons,
				relationScore: score,
			});
		}
	}

	// 関連度スコア順にソート（降順）
	related.sort((a, b) => b.relationScore - a.relationScore);

	return related;
}

// CLI として実行された場合
if (require.main === module) {
	const args = process.argv.slice(2);

	if (args.length === 0) {
		console.error("Usage: find-related.ts <keyword1> [keyword2] ...");
		console.error("Example: find-related.ts 認証 Convex");
		process.exit(1);
	}

	console.log(`🔗 Finding related decisions for: ${args.join(", ")}\n`);

	const results = findRelated(args);

	if (results.length === 0) {
		console.log("❌ No related decisions found.");
		process.exit(0);
	}

	console.log(`✅ Found ${results.length} related decision(s):\n`);

	for (const result of results) {
		console.log(`📄 ${result.title}`);
		console.log(`   Path: ${result.filePath}`);
		console.log(`   Status: ${result.status}`);
		console.log(`   Date: ${result.date}`);
		console.log(`   Relation Score: ${result.relationScore}`);
		console.log(`   Relation Reasons:`);
		for (const reason of result.relationReasons) {
			console.log(`     - ${reason}`);
		}
		console.log();
	}
}
