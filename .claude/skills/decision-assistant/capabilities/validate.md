# 決定記録の検証

決定記録の形式や必須項目を検証します。

## 検証スクリプト

**スクリプト**: `validate-decisions.ts`

```bash
# 全ての決定記録を検証
tsx ./.claude/skills/decision-assistant/scripts/validate-decisions.ts

# 特定のファイルのみ検証
tsx ./.claude/skills/decision-assistant/scripts/validate-decisions.ts .context/decisions/2025-11-16-example.md

# 複数ファイルを検証
tsx ./.claude/skills/decision-assistant/scripts/validate-decisions.ts .context/decisions/2025-*.md
```

---

## 検証項目

### 1. ファイル名の形式

**チェック内容**:
- `YYYY-MM-DD-[kebab-case-topic].md` 形式か
- 日付が有効な形式か（YYYY-MM-DD）
- トピック名がkebab-caseか

**エラー例**:
```
❌ decision.md          # 日付なし
❌ 2025-11-16_topic.md  # アンダースコア使用
❌ 2025-11-16-Topic.md  # 大文字使用
✅ 2025-11-16-topic-name.md
```

---

### 2. 必須セクション

**チェック内容**:
- タイトル（`# ` で始まる）
- 日付（`**日付**:` または `Date:`）
- ステータス（`**ステータス**:` または `Status:`）
- 決定者（`**決定者**:` または `Decider:`）
- 背景（`## 背景` または `## Background`）
- 決定（`## 決定` または `## Decision`）
- 理由（`## 理由` または `## Reason`）
- 代替案（`## 代替案` または `## Alternatives`）

**エラー例**:
```
❌ 「## 背景」セクションが見つかりません
❌ ステータスが設定されていません
```

---

### 3. ステータスの妥当性

**有効なステータス**:
- `提案中` / `Proposed`
- `承認済み` / `Approved`
- `実装完了` / `Implemented`
- `却下` / `Rejected`
- `廃止` / `Deprecated`

**エラー例**:
```
❌ ステータス: 検討中   # 無効な値
❌ ステータス: TODO     # 無効な値
✅ ステータス: 提案中
```

---

### 4. 代替案の数

**チェック内容**:
- 代替案が最低2つ以上記載されているか
- 各代替案に却下理由が記載されているか

**エラー例**:
```
❌ 代替案が1つのみ（最低2つ必要）
⚠️  代替案2の却下理由が不明確
```

---

### 5. 文字エンコーディング・改行コード

**チェック内容**:
- UTF-8エンコーディング
- LF（Unix形式）改行コード

**エラー例**:
```
❌ Shift_JISエンコーディングが検出されました
❌ CRLF改行コードが検出されました（LFに変換してください）
```

---

## 出力例

### 成功時

```bash
$ tsx ./.claude/skills/decision-assistant/scripts/validate-decisions.ts

✅ 検証完了: 5件すべて合格

詳細:
  ✅ 2025-10-26-medication-statistics.md
  ✅ 2025-10-26-prescription-management.md
  ✅ 2025-10-26-group-leave-delete.md
  ✅ 2025-10-26-migrate-to-pnpm.md
  ✅ 2025-10-16-context-driven-development.md
```

### エラー時

```bash
$ tsx ./.claude/skills/decision-assistant/scripts/validate-decisions.ts

❌ 検証失敗: 2件にエラー

エラー詳細:

📄 2025-11-16-example-decision.md
  ❌ ファイル名: トピック名にアンダースコアが含まれています
  ❌ 必須セクション: 「## 理由」が見つかりません
  ⚠️  代替案: 1つのみ（最低2つ必要）

📄 2025-11-15-another-decision.md
  ❌ ステータス: 「検討中」は無効な値です
      有効な値: 提案中, 承認済み, 実装完了, 却下, 廃止
  ❌ エンコーディング: Shift_JISが検出されました（UTF-8に変換してください）
```

---

## 使用タイミング

### 1. 決定記録作成後

新しい決定記録を作成した後、必ず検証を実行：

```bash
# 作成したファイルのみ検証
tsx ./.claude/skills/decision-assistant/scripts/validate-decisions.ts .context/decisions/2025-11-16-new-decision.md
```

### 2. コミット前

Git commitする前に、全ての決定記録を検証：

```bash
# 全ファイル検証
tsx ./.claude/skills/decision-assistant/scripts/validate-decisions.ts
```

### 3. 定期的なチェック

プロジェクトのメンテナンスとして、定期的に全ファイルを検証。

---

## 修正ガイド

### よくあるエラーと修正方法

#### 1. ファイル名の形式エラー

```bash
# エラー: 2025-11-16_example.md
# 修正: アンダースコアをハイフンに変更
git mv .context/decisions/2025-11-16_example.md .context/decisions/2025-11-16-example.md
```

#### 2. 必須セクション不足

```markdown
# エラー: 「## 理由」セクションがない
# 修正: セクションを追加

## 理由

この決定を選択した理由は以下の通りです：
- （理由を記述）
```

#### 3. ステータスの値が無効

```markdown
# エラー: **ステータス**: 検討中
# 修正: 有効な値に変更

**ステータス**: 提案中
```

#### 4. 代替案が不足

```markdown
# エラー: 代替案が1つのみ
# 修正: 最低2つ追加

## 代替案

### 代替案1: XXX

**却下理由**: ...

### 代替案2: YYY

**却下理由**: ...
```

---

## 注意事項

1. **テンプレートファイルは除外**: `.context/decisions/templates/` 内のファイルは検証対象外
2. **警告と エラーの違い**:
   - エラー（❌）: 必須項目の不足、形式エラー
   - 警告（⚠️ ): 推奨事項、品質改善の提案
3. **自動修正は行わない**: 検証のみで、自動修正は行いません（手動で修正が必要）
