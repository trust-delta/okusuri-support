---
name: code-search
description: 既存の類似機能を検索し、コーディングパターンを学習するスキル。実装前の準備に使用する。
allowed-tools: Bash, Read, Glob, Grep
---

# Code Search スキル

## 目的

実装前に既存の類似機能を検索し、プロジェクト固有のコーディングパターンを学習します。

## いつ使うか

以下のような場面で、このスキルを呼び出してください：

- **実装前の準備**: 「類似コンポーネントを探して」「既存のフックを確認して」
- **パターン学習**: 「Convex queriesのパターンを見せて」「型定義の例を探して」
- **命名規則確認**: 「List系のコンポーネント名を確認して」
- **実装参考**: 「通知機能の実装を参考にしたい」

## スキルが行うこと

1. **コンポーネント検索**
   - React componentsの検索
   - 命名パターンの確認
   - 実装パターンの抽出

2. **フック検索**
   - カスタムフックの検索
   - フック命名規則の確認
   - useパターンの学習

3. **Convex関数検索**
   - queries/mutations/actionsの検索
   - API設計パターンの確認
   - 認証・エラーハンドリングパターンの学習

4. **型定義検索**
   - interface/type定義の検索
   - Zod schemaの検索
   - 型設計パターンの確認

5. **汎用パターン検索**
   - 特定のパターンを検索
   - コーディングスタイルの確認
   - ベストプラクティスの学習

## スクリプト

### 1. コンポーネント検索

```bash
./scripts/search-components.sh <keyword> [directory]
```

**説明**: Reactコンポーネントを検索

**例**:
```bash
# 'List'を含むコンポーネントを検索
./scripts/search-components.sh List

# src/features内の'Button'を含むコンポーネントを検索
./scripts/search-components.sh Button src/features
```

**検索対象**:
- `src/features/*/components/*.tsx`
- `src/components/*.tsx`
- `src/shared/components/*.tsx`

**出力例**:
```
🔍 コンポーネント検索: 'List'
================================

📁 パターン: src/features/*/components/*List*.tsx
  ✓ src/features/notification/components/NotificationList.tsx
    ---
    export function NotificationList() {
    const notifications = useQuery(api.notifications.queries.list, {
    ...

✨ 検索完了
```

### 2. フック検索

```bash
./scripts/search-hooks.sh <keyword> [directory]
```

**説明**: カスタムフックを検索

**例**:
```bash
# 'useUser'を含むフックを検索
./scripts/search-hooks.sh useUser

# src/features内の'use'を含むフックを検索
./scripts/search-hooks.sh use src/features
```

**検索対象**:
- `src/features/*/hooks/*.ts`
- `src/features/*/hooks/*.tsx`
- `src/shared/hooks/*.ts`

**出力例**:
```
🔍 カスタムフック検索: 'useUser'
================================

📄 src/features/auth/hooks/useUser.ts
  ---
  export function useUser() {
  export const useUserPermissions = () => {
  ...

✨ 検索完了
```

### 3. Convex関数検索

```bash
./scripts/search-convex.sh <type> [function-name]
```

**説明**: Convex queries/mutations/actionsを検索

**例**:
```bash
# すべてのqueries.tsファイルを検索
./scripts/search-convex.sh queries

# 'list'を含むquery関数を検索
./scripts/search-convex.sh queries list

# 'create'を含むmutation関数を検索
./scripts/search-convex.sh mutations create
```

**type**:
- `queries` - データ取得
- `mutations` - データ更新
- `actions` - 外部API連携

**出力例**:
```
🔍 Convex queries 検索
   関数名: 'list'
================================

📄 convex/notifications/queries.ts
  ---
  export const list = query({

📄 convex/users/queries.ts
  ---
  export const listUsers = query({

✨ 検索完了
```

### 4. 型定義検索

```bash
./scripts/search-types.sh <type-name> [directory]
```

**説明**: interface/type/Zod schemaを検索

**例**:
```bash
# 'User'を含む型定義を検索
./scripts/search-types.sh User

# convex内の'Notification'型を検索
./scripts/search-types.sh Notification convex
```

**検索対象**:
- interface定義
- type定義
- Zod schema

**出力例**:
```
🔍 型定義検索: 'User'
================================

📄 src/types/user.ts
  ---
  【Interface定義】
  15:interface User {
  30:interface UserPermissions {

  【Type定義】
  45:type UserId = string;

✨ 検索完了
```

### 5. 汎用パターン検索

```bash
./scripts/search-pattern.sh <pattern> [file-type] [directory]
```

**説明**: 汎用的なパターンを検索

**例**:
```bash
# すべてのTSファイルから'async function'を検索
./scripts/search-pattern.sh 'async function'

# TSXファイルから'useQuery'を検索
./scripts/search-pattern.sh 'useQuery' tsx

# src/features内のTSファイルから'error'を検索
./scripts/search-pattern.sh 'error' ts src/features
```

**file-type**:
- `ts` - TypeScriptファイル
- `tsx` - React TSXファイル
- `all` - すべてのTS/TSXファイル（デフォルト）

**出力例**:
```
🔍 パターン検索: 'useQuery'
   ファイルタイプ: tsx
   検索ディレクトリ: .
================================

📄 src/features/notification/components/NotificationList.tsx
  ---
  15:  const notifications = useQuery(api.notifications.queries.list, {
  ...

✨ 検索完了
```

## 使用可能なツール

- **Bash**: スクリプト実行
- **Read**: ファイル内容の詳細確認（必要時）
- **Glob**: ファイルパターン検索（補助）
- **Grep**: コード検索（補助）

## 前提条件

- プロジェクトルートから実行すること
- 検索対象のファイルが存在すること

## 制限事項

### このスキルが行うこと
- ✅ 既存コードの検索
- ✅ パターンの抽出と表示
- ✅ 命名規則の確認
- ✅ 実装例の提示

### このスキルが行わないこと
- ❌ コードの実装（code-implementerサブエージェントが担当）
- ❌ パターンの評価・推奨（メインが判断）
- ❌ ファイルの作成・編集

## 実行例

### 例1: コンポーネント実装前の準備

```
メイン: 「通知一覧コンポーネントを実装したいので、類似のListコンポーネントを探して」

code-search:
1. [コンポーネント検索] ./scripts/search-components.sh List
2. [結果表示]
   - MedicineHistoryList.tsx
   - GroupMemberList.tsx
   - ...
3. [パターン分析]
   - useQuery を使用してデータ取得
   - map で一覧表示
   - 空状態のハンドリング
```

### 例2: Convex query実装前の準備

```
メイン: 「通知一覧を取得するquery関数を実装したいので、既存のqueryパターンを見せて」

code-search:
1. [Convex検索] ./scripts/search-convex.sh queries list
2. [結果表示]
   - convex/medicineHistory/queries.ts: list関数
   - convex/groups/queries.ts: listGroups関数
3. [パターン分析]
   - 認証チェック: await ctx.auth.getUserIdentity()
   - インデックス使用: withIndex("by_user", ...)
   - ページネーション: take(args.limit ?? 20)
```

### 例3: 型定義の確認

```
メイン: 「Notification型を定義したいので、既存の型定義パターンを確認して」

code-search:
1. [型定義検索] ./scripts/search-types.sh Notification
2. [結果表示]
   - convex/notifications/schema.ts: Notification interface
   - src/types/notification.ts: NotificationStatus type
3. [パターン分析]
   - interface: データ構造定義
   - type: ユニオン型、エイリアス
   - Zod schema: バリデーション
```

### 例4: 汎用パターン検索

```
メイン: 「エラーハンドリングのパターンを確認したい」

code-search:
1. [パターン検索] ./scripts/search-pattern.sh 'throw new Error'
2. [結果表示]
   - convex/*/queries.ts: 認証エラー
   - convex/*/mutations.ts: バリデーションエラー
3. [パターン分析]
   - 認証: throw new Error("認証が必要です")
   - 検証: throw new Error("無効な入力です")
```

---

## このスキルの位置づけ

このスキルは**実装準備のための検索スキル**です。

### 他スキル・サブエージェントとの連携

```
【実装ワークフロー】

1. spec-assistant → 仕様書作成
2. code-search（このスキル） → 既存パターン検索
3. code-implementer → 実装
4. type-check-lint → 品質チェック
5. error-fixer → エラー修正
6. git-workflow → コミット・プッシュ・PR
```

### 使用場面

- **code-implementer実行前**: 実装パターンを確認
- **手動実装時**: コーディングスタイルを確認
- **リファクタリング時**: 既存パターンを統一

---

## このスキルの利点

✅ **効率化**: 手動でGlob/Grepを実行する必要がなくなる
✅ **一貫性**: プロジェクト固有の検索パターンを標準化
✅ **学習支援**: 既存パターンを効率的に学習
✅ **再利用性**: サブエージェント・メインの両方から使用可能
✅ **スクリプト化**: CLIからも直接実行可能

---

## プロジェクト固有のルール（CLAUDE.md参照）

- 検索結果は実装の参考にすること
- 既存パターンを踏襲すること
- 新しいパターンを導入する場合は、decision-assistantで記録すること

---

**最終更新**: 2025年11月17日
