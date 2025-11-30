# 実装計画書テンプレート

## 基本情報

```yaml
feature: "[機能名]"
issue: "#[イシュー番号]"
branch: "[ブランチ名]"
created_at: "[作成日時]"
```

---

## 要件概要

[要件の概要を記述]

---

## 仕様書

- 機能仕様: `.context/specs/features/[feature-name].md`
- API仕様: `.context/specs/api/[feature-name]-api.md`（該当する場合）

---

## 並列実行グループ

```yaml
parallel_groups:
  # ===== Group 1: [グループ名] =====
  - name: "[グループ名]"
    order: 1
    description: "[グループの説明]"
    tasks:
      - agent: "code-implementer"  # または test-generator
        target: "[タスク名]"
        files:
          - "[ファイルパス1]"
          - "[ファイルパス2]"
        skills: []  # 使用するスキル（オプション）
        prompt: |
          [サブエージェントへの詳細指示]

          ## 技術要件
          - [要件1]
          - [要件2]

          ## 参考
          - [参考情報]

      - agent: "code-implementer"
        target: "[タスク名2]"
        files:
          - "[ファイルパス]"
        prompt: |
          [詳細指示]

  # ===== Group 2: [グループ名] =====
  - name: "[グループ名]"
    order: 2
    depends_on: "[依存グループ名]"  # 前のグループの完了を待つ
    tasks:
      - agent: "test-generator"
        target: "[テスト名]"
        files:
          - "[テストファイルパス]"
        skills: ["convex-test-guide"]  # テスト時
        prompt: |
          [テスト作成の指示]

  # ===== Group 3: [グループ名] =====
  - name: "[グループ名]"
    order: 3
    depends_on: ["[グループA]", "[グループB]"]  # 複数依存も可
    tasks:
      - agent: "code-implementer"
        target: "[タスク名]"
        files:
          - "[ファイルパス]"
        prompt: |
          [詳細指示]
```

---

## 使用するスキル

```yaml
skills_to_use:
  - name: "spec-assistant"
    purpose: "仕様書の作成・更新"
    timing: "計画フェーズ"

  - name: "git-workflow"
    purpose: "ブランチ作成、コミット、PR"
    timing: "計画・統合フェーズ"

  - name: "radix-ui-patterns"
    purpose: "UIコンポーネント実装"
    timing: "実装フェーズ（UI作成時）"

  - name: "convex-test-guide"
    purpose: "Convexテスト作成"
    timing: "実装フェーズ（テスト作成時）"

  - name: "review-assistant"
    purpose: "コードレビュー"
    timing: "統合フェーズ"
```

---

## 依存関係図

```
Group 1: [グループ名]
    │
    ├──→ Group 2: [グループ名] (depends_on: Group 1)
    │
    └──→ Group 3: [グループ名] (depends_on: Group 1)
              │
              └──→ Group 4: [グループ名] (depends_on: [Group 2, Group 3])
```

---

## リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| [リスク1] | 高/中/低 | [対策] |
| [リスク2] | 高/中/低 | [対策] |

---

## 完了条件

- [ ] すべてのタスクが完了
- [ ] 型チェックがパス
- [ ] Lint がパス
- [ ] テストがパス
- [ ] レビュー完了
- [ ] PR 作成済み

---

## 備考

[その他の注意事項や補足情報]
