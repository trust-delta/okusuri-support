# 仕様書・実装の検索

関連する仕様書や実装ファイルを検索します。

## 利用可能な検索機能

### 1. 関連ドキュメント検索

**スクリプト**: `spec-search-related.sh`

```bash
./.claude/skills/spec-assistant/scripts/spec-search-related.sh <keyword1> <keyword2> ...
```

**機能**:
- 関連する仕様書を検索
- 関連する決定記録を検索
- 関連するプロジェクトドキュメントを検索

**使用例**:
```bash
# 通知に関連するドキュメントを検索
./.claude/skills/spec-assistant/scripts/spec-search-related.sh notification

# 認証・セキュリティに関連するドキュメントを検索
./.claude/skills/spec-assistant/scripts/spec-search-related.sh auth security

# 複数キーワードで検索
./.claude/skills/spec-assistant/scripts/spec-search-related.sh medication reminder
```

**出力例**:
```
関連ドキュメント: 5件

📄 仕様書:
  1. .context/specs/features/notification.md
     マッチ: "notification", "通知"

  2. .context/specs/api/notification-api.md
     マッチ: "notification API"

📝 決定記録:
  3. .context/decisions/2025-10-26-push-notification-design.md
     マッチ: "notification", "プッシュ通知"

📖 プロジェクトドキュメント:
  4. .context/architecture.md
     マッチ: "notification system"
```

---

### 2. 関連実装ファイル検索

**スクリプト**: `spec-find-impl.sh`

```bash
./.claude/skills/spec-assistant/scripts/spec-find-impl.sh <feature> [limit]
```

**機能**:
- 指定機能に関連する実装ファイルを検索
- コンポーネント、API、hooks などを検出
- 最大件数を指定可能（デフォルト: 10件）

**使用例**:
```bash
# 通知機能の実装ファイルを検索（最大10件）
./.claude/skills/spec-assistant/scripts/spec-find-impl.sh notification

# グループ機能の実装ファイルを検索（最大5件）
./.claude/skills/spec-assistant/scripts/spec-find-impl.sh group 5

# 認証機能の実装ファイルを検索（最大3件）
./.claude/skills/spec-assistant/scripts/spec-find-impl.sh auth 3
```

**出力例**:
```
関連実装ファイル: 5件

📁 コンポーネント:
  1. src/features/notification/components/NotificationList.tsx
  2. src/features/notification/components/NotificationItem.tsx

⚙️  Convex API:
  3. convex/notification/queries.ts
  4. convex/notification/mutations.ts

🪝 Hooks:
  5. src/features/notification/hooks/useNotifications.ts
```

---

### 3. 最新仕様書一覧

**スクリプト**: `spec-list-recent.sh`

```bash
./.claude/skills/spec-assistant/scripts/spec-list-recent.sh [limit] [type]
```

**機能**:
- 最新の仕様書を一覧表示
- タイプ別にフィルタリング可能
- 件数を指定可能

**使用例**:
```bash
# 最新5件の機能仕様書を表示
./.claude/skills/spec-assistant/scripts/spec-list-recent.sh 5 features

# 最新3件のAPI仕様書を表示
./.claude/skills/spec-assistant/scripts/spec-list-recent.sh 3 api

# 最新10件の全仕様書を表示
./.claude/skills/spec-assistant/scripts/spec-list-recent.sh 10 all
```

**出力例**:
```
最新仕様書: 5件

1. notification.md（機能仕様）
   最終更新: 2025年11月16日

2. group.md（機能仕様）
   最終更新: 2025年11月10日

3. notification-api.md（API仕様）
   最終更新: 2025年11月09日

4. auth.md（機能仕様）
   最終更新: 2025年10月28日

5. medication.md（機能仕様）
   最終更新: 2025年10月20日
```

---

### 4. テンプレート一覧

**スクリプト**: `spec-list-templates.sh`

```bash
./.claude/skills/spec-assistant/scripts/spec-list-templates.sh [type]
```

**機能**:
- 利用可能なテンプレートを一覧表示
- タイプ別にフィルタリング可能

**使用例**:
```bash
# 機能仕様テンプレートを表示
./.claude/skills/spec-assistant/scripts/spec-list-templates.sh feature

# API仕様テンプレートを表示
./.claude/skills/spec-assistant/scripts/spec-list-templates.sh api

# 全テンプレートを表示
./.claude/skills/spec-assistant/scripts/spec-list-templates.sh all
```

**出力例**:
```
利用可能なテンプレート: 2件

1. feature.template.md
   パス: .context/specs/templates/feature.template.md
   用途: 機能仕様書の作成

2. api.template.md
   パス: .context/specs/templates/api.template.md
   用途: API仕様書の作成
```

---

## 検索のベストプラクティス

### 1. 新規仕様書作成前の検索

新しい仕様書を作成する前に、類似機能がないか検索することを推奨：

```bash
# ステップ1: 関連ドキュメント検索で重複チェック
./.claude/skills/spec-assistant/scripts/spec-search-related.sh notification

# ステップ2: 最新仕様書を確認してパターンを学習
./.claude/skills/spec-assistant/scripts/spec-list-recent.sh 5 features
```

### 2. 仕様書更新時の実装確認

既存仕様書を更新する際、関連実装を確認：

```bash
# 関連実装ファイルを検索
./.claude/skills/spec-assistant/scripts/spec-find-impl.sh notification 5

# 検索結果を基に、主要ファイルを Read ツールで確認
```

### 3. 効果的なキーワード選択

**良い例**:
- 機能名: `notification`, `group`, `medication`
- 技術名: `Convex`, `React`, `Next.js`
- ドメイン: `auth`, `reminder`, `dashboard`

**悪い例**:
- 一般的すぎる単語: `function`, `component`, `api`
- 文章全体を入力

---

## ワークフロー例

### 新規機能の仕様書作成前

```bash
# ステップ1: 関連ドキュメント検索
./.claude/skills/spec-assistant/scripts/spec-search-related.sh reminder notification

# ステップ2: 既存実装の確認
./.claude/skills/spec-assistant/scripts/spec-find-impl.sh reminder 3

# ステップ3: 最新仕様書でパターン学習
./.claude/skills/spec-assistant/scripts/spec-list-recent.sh 3 features

# ステップ4: テンプレート確認
./.claude/skills/spec-assistant/scripts/spec-list-templates.sh feature

# ステップ5: 検索結果を基に新規仕様書を作成
```

---

## 注意事項

1. **検索範囲**:
   - 仕様書: `.context/specs/` 配下
   - 決定記録: `.context/decisions/` 配下
   - プロジェクトドキュメント: `.context/` 配下
   - 実装ファイル: `src/`, `convex/` 配下

2. **大文字小文字**: 区別しない（case-insensitive）

3. **テンプレートファイル**: `.context/specs/templates/` は検索結果から除外

4. **実装ファイル検索の制限**: 最大件数を指定して、必要最小限のファイルのみ検索
