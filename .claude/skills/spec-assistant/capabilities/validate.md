# 仕様書の検証

仕様書の形式や必須項目を検証します。

## 検証スクリプト

**スクリプト**: `spec-validate.sh`

```bash
# 特定のファイルを検証
./.claude/skills/spec-assistant/scripts/spec-validate.sh .context/specs/features/notification.md

# 複数ファイルを検証
./.claude/skills/spec-assistant/scripts/spec-validate.sh .context/specs/features/*.md

# 全仕様書を検証
./.claude/skills/spec-assistant/scripts/spec-validate.sh .context/specs/features/*.md .context/specs/api/*.md
```

---

## 検証項目

### 1. ファイル名の形式

**機能仕様書**:
- `[feature-name].md` 形式か
- kebab-case（小文字、ハイフン区切り）か

**API仕様書**:
- `[feature-name]-api.md` 形式か
- kebab-case（小文字、ハイフン区切り）か

**エラー例**:
```
❌ Notification.md        # 大文字使用
❌ notification_api.md    # アンダースコア使用
✅ notification.md
✅ notification-api.md
```

---

### 2. 必須セクション

#### 機能仕様書（feature）

**チェック内容**:
- タイトル（`# ` で始まる）
- 最終更新（`**最終更新**:` または `Last Updated:`）
- 概要（`## 概要` または `## Overview`）
- ユースケース（`## ユースケース` または `## Use Cases`）
- 機能要件（`## 機能要件` または `## Requirements`）
- データモデル（`## データモデル` または `## Data Model`）

**エラー例**:
```
❌ 「## 概要」セクションが見つかりません
❌ 「## データモデル」セクションが見つかりません
```

#### API仕様書（api）

**チェック内容**:
- タイトル（`# ` で始まる）
- 最終更新（`**最終更新**:` または `Last Updated:`）
- 概要（`## 概要` または `## Overview`）
- Queries/Mutations/Actionsのいずれか
- データモデル（`## データモデル` または `## Data Model`）

**エラー例**:
```
❌ 「## Queries」「## Mutations」「## Actions」のいずれも見つかりません
```

---

### 3. 最終更新日の形式

**有効な形式**:
- `**最終更新**: 2025年11月16日`
- `Last Updated: 2025年11月16日`

**エラー例**:
```
❌ 最終更新: 2025-11-16    # ハイフン区切り
❌ 最終更新: 11/16/2025    # スラッシュ区切り
✅ 最終更新: 2025年11月16日
```

---

### 4. データモデルの形式

**チェック内容**:
- TypeScript形式のコードブロックがあるか
- インターフェース定義が含まれているか

**エラー例**:
```
❌ データモデルがTypeScript形式で記述されていません
⚠️  型定義が不完全です（interface/typeが見つかりません）
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
$ ./.claude/skills/spec-assistant/scripts/spec-validate.sh .context/specs/features/notification.md

✅ 検証完了: 1件すべて合格

詳細:
  ✅ .context/specs/features/notification.md
```

### エラー時

```bash
$ ./.claude/skills/spec-assistant/scripts/spec-validate.sh .context/specs/features/example.md

❌ 検証失敗: 1件にエラー

エラー詳細:

📄 .context/specs/features/example.md
  ❌ ファイル名: 大文字が含まれています（kebab-caseに変換してください）
  ❌ 必須セクション: 「## データモデル」が見つかりません
  ⚠️  最終更新: 形式が正しくありません（YYYY年MM月DD日形式で記載してください）
  ❌ データモデル: TypeScript形式で記述されていません
```

---

## 使用タイミング

### 1. 仕様書作成後

新しい仕様書を作成した後、必ず検証を実行：

```bash
./.claude/skills/spec-assistant/scripts/spec-validate.sh .context/specs/features/new-feature.md
```

### 2. 仕様書更新後

既存仕様書を更新した後、検証を実行：

```bash
./.claude/skills/spec-assistant/scripts/spec-validate.sh .context/specs/features/notification.md
```

### 3. コミット前

Git commitする前に、全ての仕様書を検証：

```bash
./.claude/skills/spec-assistant/scripts/spec-validate.sh .context/specs/features/*.md .context/specs/api/*.md
```

### 4. 定期的なチェック

プロジェクトのメンテナンスとして、定期的に全ファイルを検証。

---

## 修正ガイド

### よくあるエラーと修正方法

#### 1. ファイル名の形式エラー

```bash
# エラー: Notification.md（大文字）
# 修正: kebab-caseに変換
git mv .context/specs/features/Notification.md .context/specs/features/notification.md
```

#### 2. 必須セクション不足

```markdown
# エラー: 「## データモデル」セクションがない
# 修正: セクションを追加

## データモデル

\`\`\`typescript
interface Notification {
  _id: Id<"notifications">;
  // ...
}
\`\`\`
```

#### 3. 最終更新日の形式エラー

```markdown
# エラー: **最終更新**: 2025-11-16
# 修正: YYYY年MM月DD日形式に変更

**最終更新**: 2025年11月16日
```

#### 4. データモデルの形式エラー

```markdown
# エラー: データモデルがTypeScript形式でない
# 修正: TypeScriptコードブロックで記述

## データモデル

\`\`\`typescript
interface Notification {
  _id: Id<"notifications">;
  userId: Id<"users">;
  message: string;
  isRead: boolean;
  _creationTime: number;
}
\`\`\`
```

---

## 注意事項

1. **テンプレートファイルは除外**: `.context/specs/templates/` 内のファイルは検証対象外
2. **警告とエラーの違い**:
   - エラー（❌）: 必須項目の不足、形式エラー
   - 警告（⚠️）: 推奨事項、品質改善の提案
3. **自動修正は行わない**: 検証のみで、自動修正は行いません（手動で修正が必要）
4. **軽量な検証**: 形式チェックのみで、内容の妥当性までは検証しません
