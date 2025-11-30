# 計画フェーズ (Plan Phase)

実装前に要件を分析し、並列実行可能な実装計画を策定するフェーズ。

## 実行手順

### Step 1: 要件分析

1. **イシュー/要件の確認**
   ```bash
   # GitHub イシューの場合
   gh issue view <issue-number>
   ```

2. **関連ファイルの探索**
   - Task(Explore) サブエージェントで関連コードを調査
   - 既存の類似機能を参考にする

3. **スキーマ確認**
   - Convex スキーマに変更が必要か確認
   - 既存フィールドで対応可能か判断

### Step 2: 仕様書作成

**spec-assistant スキルを使用**:

```
Skill(spec-assistant)
→ 「機能仕様を作成」を選択
```

出力先: `.context/specs/features/<feature-name>.md`

### Step 3: ブランチ作成

**git-workflow スキルを使用**:

```
Skill(git-workflow)
→ ブランチ命名規則に従って作成
```

例:
```bash
git checkout -b feature/<feature-name>
```

### Step 4: 実装計画の策定

**Plan サブエージェントを使用**:

```
Task(Plan)
プロンプト:
「以下の仕様に基づき、並列実行可能な実装計画を策定してください。

## 仕様
[仕様書の内容]

## 出力フォーマット
implementation-plan.template.md に従った YAML 形式

## 考慮事項
- ファイル間の依存関係を分析
- 並列可能なタスクをグループ化
- 各タスクに適切なサブエージェントを割り当て
- 使用すべきスキルを特定
」
```

---

## 並列グループの分類基準

### 並列可能（同一グループ内）

| パターン | 例 |
|---------|-----|
| 独立したコンポーネント | `ComponentA.tsx`, `ComponentB.tsx` |
| 同じ親を持たないテスト | `A.test.tsx`, `B.test.tsx` |
| 別機能のAPI | `apiA.ts`, `apiB.ts` |

### 直列必須（依存関係あり）

| パターン | 理由 |
|---------|------|
| スキーマ → 実装 | 型定義が必要 |
| コンポーネント → テスト | テスト対象が必要 |
| 実装 → index.ts export | export 対象が必要 |
| 親 → 子コンポーネント | props の型が必要 |

---

## 計画書の出力例

```yaml
feature: "服薬メモ機能"
issue: "#17"
branch: "feature/medication-memo"

parallel_groups:
  - name: "新規コンポーネント"
    order: 1
    tasks:
      - agent: "code-implementer"
        target: "MemoEditDialog"
        files:
          - "app/_shared/features/medication/components/memo-edit-dialog.tsx"
        skills: ["radix-ui-patterns"]
        prompt: |
          MemoEditDialog コンポーネントを作成。
          - 500文字制限のテキストエリア
          - 追加/編集/削除機能
          - DialogTitle, DialogDescription を含める

      - agent: "code-implementer"
        target: "MemoExportButton"
        files:
          - "app/(private)/history/_components/MemoExportButton.tsx"
        prompt: |
          メモ一覧をクリップボードにコピーする機能。
          - 日付範囲でフィルター
          - テキスト形式で出力

  - name: "テスト作成"
    order: 2
    depends_on: "新規コンポーネント"
    tasks:
      - agent: "test-generator"
        target: "MemoEditDialog.test"
        files:
          - "app/_shared/features/medication/components/memo-edit-dialog.test.tsx"
        skills: ["convex-test-guide"]
        prompt: |
          MemoEditDialog のユニットテスト。
          - 表示/非表示
          - 入力/保存
          - 削除
          - バリデーション

  - name: "既存ファイル変更"
    order: 3
    depends_on: "新規コンポーネント"
    tasks:
      - agent: "code-implementer"
        target: "RecordFilters変更"
        files:
          - "app/(private)/history/_components/RecordFilters.tsx"
        prompt: |
          memoOnly フィルターを追加。
          - Checkbox コンポーネント追加
          - FilterState に memoOnly: boolean 追加

  - name: "統合"
    order: 4
    depends_on: ["テスト作成", "既存ファイル変更"]
    tasks:
      - agent: "code-implementer"
        target: "ページ統合"
        files:
          - "app/(private)/history/page.tsx"
          - "app/(private)/history/_components/index.ts"
          - "app/_shared/features/medication/components/index.ts"
        prompt: |
          新規コンポーネントをページに統合。
          - import 追加
          - フィルターロジック追加
          - index.ts に export 追加

skills_to_use:
  - spec-assistant
  - git-workflow
  - radix-ui-patterns
  - review-assistant
```

---

## チェックリスト

計画策定時に確認すべき項目:

- [ ] 要件は明確か
- [ ] 仕様書は作成されたか
- [ ] ブランチは作成されたか
- [ ] スキーマ変更は必要か
- [ ] 並列グループは適切に分類されたか
- [ ] 依存関係は正しく設定されたか
- [ ] 使用するスキルは特定されたか

---

## 次のステップ

計画が完成したら:

1. **ユーザーに計画を提示**して承認を得る
2. 承認後、[capabilities/implement.md](implement.md) に進む
