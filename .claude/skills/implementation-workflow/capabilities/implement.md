# 実装フェーズ (Implement Phase)

計画に基づき、並列でサブエージェントを起動して実装を進めるフェーズ。

## 前提条件

- 計画フェーズで実装計画書が作成されていること
- ユーザーから計画の承認を得ていること

---

## 実行手順

### Step 1: 並列グループの実行

計画書の `parallel_groups` を `order` 順に実行。
同一グループ内のタスクは**並列**で実行。

#### 並列実行の方法

**単一メッセージで複数の Task を呼び出す**:

```xml
<!-- Group 1: 新規コンポーネント（並列） -->
<Task subagent_type="code-implementer">
  <prompt>
    MemoEditDialog コンポーネントを作成。
    [詳細指示...]
  </prompt>
</Task>

<Task subagent_type="code-implementer">
  <prompt>
    MemoExportButton コンポーネントを作成。
    [詳細指示...]
  </prompt>
</Task>
```

### Step 2: 依存グループの待機

`depends_on` で指定されたグループの完了を待ってから次のグループを実行。

```
Group 1 (並列) → 完了待ち → Group 2 (並列) → 完了待ち → Group 3
```

### Step 3: スキルの適用

各タスクで指定された `skills` を適用:

| スキル | 適用タイミング |
|--------|--------------|
| `radix-ui-patterns` | Dialog, Form などの UI 実装時 |
| `convex-test-guide` | Convex mutation/query のテスト時 |

---

## サブエージェントへの指示テンプレート

### code-implementer への指示

```
## タスク
[コンポーネント名] を実装してください。

## ファイルパス
[ファイルパス]

## 仕様
[仕様の詳細]

## 技術要件
- TypeScript で型安全に実装
- any 型は使用禁止
- shadcn/ui コンポーネントを使用

## アクセシビリティ
- DialogTitle, DialogDescription を必ず含める
- aria 属性を適切に設定

## 参考
- 既存の類似コンポーネント: [パス]
- 仕様書: [パス]

## 出力
実装完了後、以下を報告:
- 作成/変更したファイル一覧
- 実装の概要
- 注意点や課題
```

### test-generator への指示

```
## タスク
[コンポーネント名] のテストを作成してください。

## テスト対象
[ファイルパス]

## テストケース
- 基本的な表示
- ユーザー操作
- エラーハンドリング
- エッジケース

## 技術要件
- Vitest + React Testing Library
- userEvent を使用
- 非同期処理は waitFor でラップ

## 参考
- 既存のテスト: [パス]
- convex-test-guide スキル

## 出力
テスト完了後、以下を報告:
- 作成したテストファイル
- テストケース一覧
- カバレッジの概要
```

---

## エラー対応

### 並列実行中のエラー

1. **単一タスクのエラー**
   - 他のタスクは継続可能か判断
   - 依存関係がなければ継続
   - 依存関係があれば全体を停止

2. **型エラー**
   - error-fixer サブエージェントを起動
   - または手動で修正

3. **依存関係の問題**
   - 計画の見直しが必要
   - グループ分けを再検討

### リカバリー手順

```bash
# 変更を確認
git status
git diff

# 問題のあるファイルを元に戻す
git checkout -- <file>

# 再実行
```

---

## 実行ログの管理

各グループの実行状況を TodoWrite で追跡:

```
- [ ] Group 1: 新規コンポーネント
  - [ ] MemoEditDialog
  - [ ] MemoExportButton
- [ ] Group 2: テスト作成
  - [ ] MemoEditDialog.test
- [ ] Group 3: 既存ファイル変更
- [ ] Group 4: 統合
```

---

## 完了条件

以下がすべて満たされたら実装フェーズ完了:

- [ ] すべてのグループが完了
- [ ] 型チェックがパス (`npx tsc --noEmit`)
- [ ] Lint がパス (`npm run lint`)
- [ ] テストがパス (`npm test`)

---

## 次のステップ

実装が完了したら:

1. **コミット**を作成（git-workflow スキル）
2. [capabilities/integrate.md](integrate.md) に進む
