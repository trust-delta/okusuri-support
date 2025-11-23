# 決定記録の検索

既存の決定記録を検索し、関連する過去の決定を発見します。

## 利用可能な検索機能

### 1. キーワード検索

**スクリプト**: `search-decisions.ts`

```bash
tsx ./.claude/skills/decision-assistant/scripts/search-decisions.ts <keyword1> <keyword2> ...
```

**機能**:
- タイトル・本文からキーワード検索
- マッチスコアで優先順位付け
- 複数キーワードのAND検索

**使用例**:
```bash
# 認証に関する決定を検索
tsx ./.claude/skills/decision-assistant/scripts/search-decisions.ts 認証 auth

# Next.jsに関する決定を検索
tsx ./.claude/skills/decision-assistant/scripts/search-decisions.ts Next.js nextjs
```

**出力例**:
```
検索結果: 3件

1. [スコア: 0.85] 2025-10-26-auth-migration-to-convex.md
   タイトル: Convex Authへの移行
   マッチ: "認証", "auth", "Convex"

2. [スコア: 0.72] 2025-09-15-authentication-method-selection.md
   タイトル: 認証方式の選定
   マッチ: "認証", "auth"
```

---

### 2. 関連決定の発見

**スクリプト**: `find-related.ts`

```bash
tsx ./.claude/skills/decision-assistant/scripts/find-related.ts <keyword1> <keyword2> ...
```

**機能**:
- 同じカテゴリ・技術スタックの決定を検索
- 関連度スコアで優先順位付け
- 過去の知見・文脈を把握

**使用例**:
```bash
# 認証関連の過去の決定を発見
tsx ./.claude/skills/decision-assistant/scripts/find-related.ts 認証 セキュリティ

# データベース関連の決定を発見
tsx ./.claude/skills/decision-assistant/scripts/find-related.ts database Convex
```

**出力例**:
```
関連する決定: 4件

1. [関連度: 0.92] 2025-10-26-auth-migration-to-convex.md
   カテゴリ: セキュリティ
   関連タグ: 認証, Convex, セキュリティ

2. [関連度: 0.78] 2025-09-20-session-management.md
   カテゴリ: セキュリティ
   関連タグ: セッション, 認証
```

---

## 検索のベストプラクティス

### 1. 新規決定作成前の検索

新しい決定を記録する前に、関連する過去の決定がないか検索することを推奨：

1. **キーワード検索**で重複チェック
2. **関連決定の発見**で過去の知見を活用
3. 矛盾する決定がないか確認

### 2. 効果的なキーワード選択

**良い例**:
- 技術名: `Next.js`, `Convex`, `React`
- 機能名: `認証`, `グループ`, `通知`
- カテゴリ: `セキュリティ`, `アーキテクチャ`, `パフォーマンス`

**悪い例**:
- 一般的すぎる単語: `使用`, `実装`, `変更`
- 文章全体を入力

### 3. 複数キーワードの活用

より正確な結果を得るために、複数のキーワードを組み合わせる：

```bash
# 良い例: 具体的な技術名 + カテゴリ
tsx ./.claude/skills/decision-assistant/scripts/search-decisions.ts Convex データベース

# 良い例: 日本語 + 英語
tsx ./.claude/skills/decision-assistant/scripts/search-decisions.ts 認証 authentication
```

---

## ワークフロー例

### 新規決定作成前のチェック

```bash
# ステップ1: キーワード検索で重複確認
tsx ./.claude/skills/decision-assistant/scripts/search-decisions.ts フォーム管理 react-hook-form

# ステップ2: 関連決定を発見
tsx ./.claude/skills/decision-assistant/scripts/find-related.ts フォーム UI ライブラリ

# ステップ3: 検索結果を確認し、重複がなければ新規作成へ
```

---

## 注意事項

1. **検索範囲**: `.context/decisions/` 配下の全Markdownファイルが対象
2. **大文字小文字**: 区別しない（case-insensitive）
3. **ファイル名**: テンプレートファイル（`templates/`）は除外
4. **スコアリング**: タイトルマッチの方が本文マッチより高スコア
