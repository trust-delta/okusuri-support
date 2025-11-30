---
name: implementation-workflow
description: |
  機能実装の一連のワークフローを標準化し、並列実行で効率化する。
  イシュー解決、新機能実装、リファクタリングなど、複数ファイルに渡る変更を計画的に進める。
  <example>
  - 「イシュー#17を解決して」
  - 「新機能を実装したい」
  - 「この機能をリファクタリング」
  </example>
---

# Implementation Workflow

機能実装の一連のワークフローを標準化し、並列実行による効率化を実現するスキル。

## ワークフロー概要

```
┌─────────────────────────────────────────────────────┐
│ Phase 1: 計画（直列）                                │
│  ├─ 要件分析                                        │
│  ├─ spec-assistant で仕様書作成                     │
│  ├─ git-workflow でブランチ作成                     │
│  └─ 実装計画の策定（並列グループ分類）               │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│ Phase 2: 並列実装                                    │
│  ├─ 独立コンポーネントの並列実装                     │
│  ├─ 並列テスト作成                                  │
│  └─ 依存グループは順次実行                          │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│ Phase 3: 統合・レビュー（直列）                       │
│  ├─ 統合確認・型チェック・lint                       │
│  ├─ review-assistant でレビュー                     │
│  └─ git-workflow でPR作成                           │
└─────────────────────────────────────────────────────┘
```

---

## 利用可能な機能

### 1. 計画フェーズ
要件を分析し、並列実行可能な実装計画を策定します。

**使用例**:
- 「イシュー#17の実装計画を立てて」
- 「この機能の実装計画を作成」

**詳細**: [capabilities/plan.md](capabilities/plan.md)

---

### 2. 実装フェーズ
計画に基づき、並列でサブエージェントを起動して実装します。

**使用例**:
- 「計画に従って並列実装を開始」
- 「実装フェーズに進む」

**詳細**: [capabilities/implement.md](capabilities/implement.md)

---

### 3. 統合・レビューフェーズ
実装結果を統合し、レビュー・PR作成まで完了します。

**使用例**:
- 「実装をレビューしてPRを作成」
- 「統合フェーズに進む」

**詳細**: [capabilities/integrate.md](capabilities/integrate.md)

---

## 実装計画テンプレート

計画フェーズで出力する実装計画のフォーマット:

```yaml
# 実装計画書
feature: "機能名"
issue: "#17"
branch: "feature/xxx"

# 並列実行グループ
parallel_groups:
  - name: "UI実装"
    order: 1
    tasks:
      - agent: "code-implementer"
        target: "ComponentA"
        files: ["path/to/component-a.tsx"]
        prompt: "実装の詳細指示..."
      - agent: "code-implementer"
        target: "ComponentB"
        files: ["path/to/component-b.tsx"]
        prompt: "実装の詳細指示..."

  - name: "テスト作成"
    order: 2
    depends_on: "UI実装"
    tasks:
      - agent: "test-generator"
        target: "ComponentA.test"
        files: ["path/to/component-a.test.tsx"]
        prompt: "テストの詳細指示..."

  - name: "統合"
    order: 3
    depends_on: "テスト作成"
    tasks:
      - agent: "code-implementer"
        target: "ページ統合"
        files: ["path/to/page.tsx", "path/to/index.ts"]
        prompt: "統合の詳細指示..."

# 使用するスキル
skills_to_use:
  - spec-assistant    # 仕様書作成
  - git-workflow      # ブランチ・PR
  - radix-ui-patterns # UIコンポーネント実装時
  - convex-test-guide # Convexテスト作成時
  - review-assistant  # レビュー時
```

**テンプレートファイル**: [templates/implementation-plan.template.md](templates/implementation-plan.template.md)

---

## 並列実行のルール

### 並列可能な条件
- ファイルの依存関係がない
- 型定義が確定している（interfaceが先に決まっている）
- 共通の親コンポーネントを同時に編集しない

### 並列不可の例
- 親コンポーネントと子コンポーネントを同時編集
- export追加と利用側を同時編集
- スキーマ変更とそれを使う実装

### 推奨パターン
```
Group 1: 独立コンポーネント実装（並列）
    ↓
Group 2: テスト作成（並列、Group 1完了後）
    ↓
Group 3: 統合・既存ファイル変更（直列）
```

---

## 実行フロー

ユーザーのリクエストに応じて、該当するフェーズのガイドを読み込んでください：

1. **計画を立てる** → `capabilities/plan.md` を読み込む
2. **実装を開始** → `capabilities/implement.md` を読み込む
3. **統合・レビュー** → `capabilities/integrate.md` を読み込む

### 全フェーズ実行（推奨）

「イシューを解決」「機能を実装」などの包括的なリクエストの場合:

1. `capabilities/plan.md` で計画策定
2. ユーザー承認を得る
3. `capabilities/implement.md` で並列実装
4. `capabilities/integrate.md` で統合・レビュー・PR

---

## 連携するスキル・サブエージェント

| 種類 | 名前 | 用途 |
|------|------|------|
| スキル | `spec-assistant` | 仕様書作成・更新 |
| スキル | `git-workflow` | ブランチ・コミット・PR |
| スキル | `radix-ui-patterns` | UIコンポーネント実装 |
| スキル | `convex-test-guide` | Convexテスト作成 |
| スキル | `review-assistant` | コードレビュー |
| サブエージェント | `Plan` | 実装計画の策定 |
| サブエージェント | `code-implementer` | コード実装（並列可） |
| サブエージェント | `test-generator` | テスト作成（並列可） |
| サブエージェント | `error-fixer` | エラー修正 |

---

## 注意事項

1. **計画の承認**: 並列実装前に必ずユーザーに計画を確認
2. **依存関係の厳守**: depends_on で指定されたグループの完了を待つ
3. **エラー時の対応**: 並列実行中にエラーが出た場合は他のタスクも停止を検討
4. **小規模タスクは不要**: 1-2ファイルの変更ならこのスキルは過剰

---

**最終更新**: 2025年12月01日
