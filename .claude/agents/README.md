# エージェント選択ガイド

このドキュメントは、利用可能なサブエージェントの選択基準を定義します。

## 利用可能なエージェント

| エージェント | 用途 | モデル |
|-------------|------|--------|
| error-fixer | エラー修正 | sonnet |
| code-implementer | コード実装 | sonnet |
| test-runner | テスト実行・分析 | sonnet |

---

## 選択フローチャート

```
ユーザーのリクエスト
         │
         ▼
   ┌─────────────────┐
   │ エラーが発生？   │
   └────────┬────────┘
            │
     ┌──────┴──────┐
     │             │
   Yes            No
     │             │
     ▼             ▼
┌─────────┐  ┌─────────────────┐
│error-   │  │ 新機能の実装？   │
│fixer    │  └────────┬────────┘
└─────────┘           │
                ┌─────┴─────┐
                │           │
              Yes          No
                │           │
                ▼           ▼
          ┌──────────┐  メインエージェントで
          │code-     │  直接対応
          │implementer│
          └──────────┘
```

---

## error-fixer を使うタイミング

### 使用する場面
- `npm run type-check` でエラーが発生した
- `npm run lint` でエラーが発生した
- `npm run build` でコンパイルエラーが発生した
- 既存コードに型エラーがある

### 使用しない場面
- 新規機能の実装（→ code-implementer）
- 仕様書の作成・更新（→ spec-assistant スキル）
- 技術決定の記録（→ decision-assistant スキル）

### 呼び出し例
```
Task(subagent_type="error-fixer"):
「以下の型エラーを修正してください:
- src/features/medication/components/MedicationList.tsx:42
  Type 'string' is not assignable to type 'number'
」
```

---

## code-implementer を使うタイミング

### 使用する場面
- 小規模な機能実装（1-3ファイル程度）
- 既存パターンに従った新規コンポーネント作成
- API関数（query/mutation/action）の追加
- 既存コードの軽微な拡張

### 使用しない場面
- エラー修正のみ（→ error-fixer）
- 大規模な機能実装（→ メインエージェントで段階的に）
- Git操作が必要な場合（→ メインエージェント）
- 仕様書の作成（→ spec-assistant スキル）

### 呼び出し例
```
Task(subagent_type="code-implementer"):
「以下の機能を実装してください:
- 機能: 処方箋の複製
- 仕様: 既存の処方箋をコピーして新しい処方箋を作成
- 参照: convex/prescription/mutations.ts の既存パターン
」
```

---

## メインエージェントで対応するケース

以下の場合はサブエージェントを使用せず、メインエージェントが直接対応します：

1. **大規模な機能実装**
   - 4ファイル以上の変更が必要
   - アーキテクチャレベルの設計判断が必要

2. **Git操作**
   - ブランチ作成、コミット、プッシュ、PR作成

3. **技術決定の記録**
   - decision-assistant スキルを使用

4. **仕様書の作成・更新**
   - spec-assistant スキルを使用

5. **調査・分析タスク**
   - コードベースの調査
   - パフォーマンス分析
   - セキュリティ監査

---

## 複合タスクの場合

複数のエージェントが必要な場合は、順次呼び出します：

### 例: 新機能実装 + エラー修正

1. **code-implementer** で機能を実装
2. 実装後に `npm run type-check` を実行
3. エラーがあれば **error-fixer** で修正

```
# ステップ1: 実装
Task(subagent_type="code-implementer"):
「処方箋の削除確認ダイアログを実装」

# ステップ2: 検証
Bash: npm run type-check

# ステップ3: エラー修正（必要な場合）
Task(subagent_type="error-fixer"):
「上記のエラーを修正」
```

---

## test-runner を使うタイミング

### 使用する場面
- `npm run test` でテストを実行したい
- `npx playwright test` でE2Eテストを実行したい
- テスト失敗の原因を分析したい
- テストカバレッジを確認したい

### 使用しない場面
- テストコードの修正（→ error-fixer または code-implementer）
- 新規テストの作成（→ code-implementer）
- 実装コードの変更（→ code-implementer）

### 呼び出し例
```
Task(subagent_type="test-runner"):
「以下のテストを実行して結果を分析してください:
- npm run test
- 失敗したテストがあれば原因を特定
」
```

---

## 最終更新

2025年11月29日
