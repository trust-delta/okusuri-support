---
name: type-check-lint
description: TypeScriptの型チェックとLintを実行し、エラーを報告する。コード品質を保証するための検証スキル。
allowed-tools: Bash, Read, Grep
---

# Type Check & Lint スキル

## 目的

プロジェクトのTypeScript型チェックとLintを実行し、コード品質を保証します。エラーがある場合は詳細を報告し、修正のガイダンスを提供します。

## いつ使うか

以下のような場面で、このスキルを呼び出してください：

- **実装後の検証**: 「コードを書いたので、型チェックとlintを実行して」
- **コミット前チェック**: 「コミット前に品質チェックをしたい」
- **エラー確認**: 「型エラーやlintエラーがないか確認して」
- **CI前の事前検証**: 「プッシュする前に問題がないか確認したい」

## スキルが行うこと

1. **TypeScript型チェック**
   - `npm run type-check`を実行
   - 型エラーを検出
   - エラー箇所のファイルパスと行番号を報告

2. **Lint実行**
   - `npm run lint`を実行
   - Lintエラーと警告を検出
   - 修正可能なエラーを識別

3. **エラー詳細レポート**
   - エラーの重大度を分類（型エラー、Lintエラー、Lint警告）
   - ファイルごとにエラーを整理
   - 修正のヒントを提供

4. **成功時の確認**
   - すべてのチェックが通過したことを報告
   - コミット可能な状態であることを通知

## 実行時の動作

### 1. Type Check実行

```bash
npm run type-check
```

**出力の解析**:
- エラー件数をカウント
- ファイルパスと行番号を抽出
- エラーメッセージを整理

### 2. Lint実行

```bash
npm run lint
```

**出力の解析**:
- エラーと警告を分類
- 自動修正可能なエラーを識別
- ファイルごとにグループ化

### 3. レポート生成

以下の形式でレポートを生成します：

```markdown
## Type Check & Lint レポート

**実行日時**: 2025年11月17日

### ✅ Type Check: 成功
型エラーなし

### ✅ Lint: 成功
Lintエラーなし

---

**結果**: すべてのチェックが通過しました。コミット可能な状態です。
```

エラーがある場合：

```markdown
## Type Check & Lint レポート

**実行日時**: 2025年11月17日

### ❌ Type Check: 3件のエラー

#### src/components/Button.tsx
- **Line 42**: Type 'string' is not assignable to type 'number'
- **Line 58**: Property 'onClick' is missing in type '{ label: string; }'

### ⚠️ Lint: 2件のエラー、5件の警告

#### convex/groups/mutations.ts
- **Line 120** (error): 'userId' is already declared in the upper scope
- **Line 145** (warning): 'result' is assigned a value but never used

---

**結果**: 修正が必要です。
```

## 使用可能なツール

- **Bash**: type-check、lintコマンドの実行
- **Read**: エラー箇所のコードを読み込んで詳細確認
- **Grep**: 特定のエラーパターンを検索

## 制限事項

### このスキルが行うこと
- ✅ Type checkの実行と結果報告
- ✅ Lintの実行と結果報告
- ✅ エラーの整理と分類
- ✅ 修正のヒント提供

### このスキルが行わないこと
- ❌ エラーの自動修正（修正はユーザーまたは別のスキル・サブエージェントが実施）
- ❌ コードのリファクタリング
- ❌ テストの実行（別のスキルで対応）

## 実行例

### 例1: すべて成功

```
ユーザー: 「type checkとlintを実行して」

type-check-lint:
1. [Type Check実行] npm run type-check
2. [結果] エラーなし
3. [Lint実行] npm run lint
4. [結果] エラーなし
5. [レポート] ✅ すべてのチェックが通過しました
```

### 例2: エラー検出

```
ユーザー: 「品質チェックをお願い」

type-check-lint:
1. [Type Check実行] npm run type-check
2. [結果] 3件のエラー検出
3. [詳細確認] エラー箇所のファイルを確認
4. [Lint実行] npm run lint
5. [結果] 2件のエラー、5件の警告
6. [レポート] ❌ 修正が必要なエラーを報告
```

---

## このスキルの位置づけ

このスキルは**コード品質保証**のための検証特化型スキルです。

- **code-implementerサブエージェント**から実装後に呼び出される
- **実装前のチェック**としても単独で使用可能
- **CI/CD前の事前検証**としても活用できる

検証専用のため、エラー修正は行わず、報告のみを行います。修正が必要な場合は、別のスキル・サブエージェント、またはユーザーが対応します。
