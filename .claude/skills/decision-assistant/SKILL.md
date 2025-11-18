---
name: decision-assistant
description: 技術的意思決定や重要な判断を構造化して記録する。背景・理由・代替案を整理し、将来の参照価値が高い決定記録を生成する。
---

# Decision Assistant

技術的意思決定を構造化して記録・検索・分析するスキル。

## 利用可能な機能

### 1. 新規作成
技術的決定を対話形式で構造化して記録します。

**使用例**:
- 「Next.js 15に移行すべきか決定を記録したい」
- 「認証方式の選定を記録して」
- 「グループ削除機能の設計を記録」

**詳細**: [capabilities/create.md](capabilities/create.md)

---

### 2. 検索
既存の決定記録を検索します。

**使用例**:
- 「認証に関する決定を検索」
- 「Next.jsの決定を探して」
- 「この決定に関連する過去の決定は？」

**詳細**: [capabilities/search.md](capabilities/search.md)

---

### 3. 検証
決定記録の形式や必須項目を検証します。

**使用例**:
- 「決定記録を検証して」
- 「フォーマットが正しいか確認」

**詳細**: [capabilities/validate.md](capabilities/validate.md)

---

### 4. 分析
決定の傾向、履歴、競合を分析します。

**使用例**:
- 「決定の統計を見せて」
- 「決定の履歴を確認」
- 「矛盾する決定を検出」

**詳細**: [capabilities/analyze.md](capabilities/analyze.md)

---

## 基本的な実行フロー

ユーザーのリクエストに応じて、該当する機能のガイドを読み込んでください：

1. **決定を記録/作成/記述** → `capabilities/create.md` を読み込む
2. **決定を検索/探す/参照** → `capabilities/search.md` を読み込む
3. **決定を検証/チェック** → `capabilities/validate.md` を読み込む
4. **決定を分析/統計/履歴** → `capabilities/analyze.md` を読み込む

---

## 出力先

- **決定記録**: `.context/decisions/YYYY-MM-DD-[topic].md`
- **テンプレート**: `.context/decisions/templates/decision-template.md`

---

## 利用可能なスクリプト

| スクリプト | 機能 | 使用コマンド |
|----------|------|------------|
| get-date.sh | JST日付取得 | `./scripts/get-date.sh` |
| search-decisions.ts | キーワード検索 | `tsx scripts/search-decisions.ts <keywords>` |
| find-related.ts | 関連決定検索 | `tsx scripts/find-related.ts <keywords>` |
| find-conflicts.ts | 競合検出 | `tsx scripts/find-conflicts.ts <keywords>` |
| validate-decisions.ts | 決定記録検証 | `tsx scripts/validate-decisions.ts [files]` |
| decision-stats.ts | 統計情報 | `tsx scripts/decision-stats.ts` |
| decision-history.ts | 履歴表示 | `tsx scripts/decision-history.ts [limit]` |
