---
name: spec-assistant
description: 新機能の仕様書を対話形式で作成、または既存仕様書を実装に合わせて更新する。プロジェクトのテンプレートに準拠し、一貫性のある仕様書を生成する。
---

# Spec Assistant

機能仕様書・API仕様書を構造化して作成・更新し、実装と仕様書の同期を維持するスキル。

## 利用可能な機能

### 1. 機能仕様作成
新機能の仕様書を対話形式で作成します。

**使用例**:
- 「通知機能の仕様書を作成して」
- 「リマインダー機能の仕様を整理したい」
- 「グループ管理機能を文書化」

**詳細**: [capabilities/create-feature.md](capabilities/create-feature.md)

---

### 2. API仕様作成
API仕様書を対話形式で作成します。

**使用例**:
- 「認証APIの仕様書を作成」
- 「グループAPIを文書化したい」
- 「通知API仕様を作成」

**詳細**: [capabilities/create-api.md](capabilities/create-api.md)

---

### 3. 仕様書更新
既存仕様書を実装変更に合わせて更新します。

**使用例**:
- 「グループ機能の実装を変更したので、仕様書を更新」
- 「通知機能に新しいフィールドを追加したので反映」
- 「仕様書と実装を同期させて」

**詳細**: [capabilities/update.md](capabilities/update.md)

---

### 4. 仕様書検証
仕様書の形式や必須項目を検証します。

**使用例**:
- 「仕様書を検証して」
- 「フォーマットが正しいか確認」

**詳細**: [capabilities/validate.md](capabilities/validate.md)

---

### 5. 関連検索
関連する仕様書や実装ファイルを検索します。

**使用例**:
- 「通知に関連する仕様書を検索」
- 「この仕様の実装ファイルを探して」

**詳細**: [capabilities/search.md](capabilities/search.md)

---

## 基本的な実行フロー

ユーザーのリクエストに応じて、該当する機能のガイドを読み込んでください：

1. **機能仕様を作成** → `capabilities/create-feature.md` を読み込む
2. **API仕様を作成** → `capabilities/create-api.md` を読み込む
3. **仕様を更新/同期** → `capabilities/update.md` を読み込む
4. **仕様を検証/チェック** → `capabilities/validate.md` を読み込む
5. **仕様を検索/探す** → `capabilities/search.md` を読み込む

---

## 出力先

- **機能仕様**: `.context/specs/features/[feature-name].md`
- **API仕様**: `.context/specs/api/[feature-name]-api.md`
- **テンプレート**:
  - `.context/specs/templates/feature.template.md` （機能仕様）
  - `.context/specs/templates/api.template.md` （API仕様）

---

## 利用可能なスクリプト

| スクリプト | 機能 | 使用コマンド |
|----------|------|------------|
| get-date.sh | JST日付取得 | `./.claude/skills/shared/scripts/get-date.sh [format]` |
| spec-list-recent.ts | 最新仕様書一覧 | `tsx ./.claude/skills/spec-assistant/scripts/spec-list-recent.ts 5 features` |
| spec-list-templates.ts | テンプレート一覧 | `tsx ./.claude/skills/spec-assistant/scripts/spec-list-templates.ts feature` |
| spec-to-kebab-case.ts | kebab-case変換 | `tsx ./.claude/skills/spec-assistant/scripts/spec-to-kebab-case.ts "通知機能"` |
| spec-validate.ts | 仕様書検証 | `tsx ./.claude/skills/spec-assistant/scripts/spec-validate.ts <file>` |
| spec-search-related.ts | 関連検索 | `tsx ./.claude/skills/spec-assistant/scripts/spec-search-related.ts <keywords>` |
| spec-find-impl.ts | 実装ファイル検索 | `tsx ./.claude/skills/spec-assistant/scripts/spec-find-impl.ts <feature> 5` |
