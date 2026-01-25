# Result型仕様

**最終更新**: 2026年01月25日

## 概要

Convexバックエンドにおけるエラーハンドリングのための型定義とヘルパー関数を提供します。mutation/actionの戻り値を統一し、フロントエンドでの一貫したエラー処理を実現します。

---

## ユースケース

### 主要シナリオ

**シナリオ1: mutationでのエラー返却**
1. ユーザーがグループを更新しようとする
2. バックエンドで権限チェックを実行
3. 権限がない場合、`error("このグループのメンバーではありません")`を返却
4. フロントエンドで`isSuccess`を判定し、エラーメッセージを表示

**シナリオ2: 成功時のデータ返却**
1. ユーザーが薬を登録する
2. バックエンドで薬を作成
3. `success(medicineId)`で作成したIDを返却
4. フロントエンドで`result.data`からIDを取得

**シナリオ3: 複数のエラーチェック**
1. グループ存在確認 → エラーなら早期リターン
2. 認証確認 → エラーなら早期リターン
3. メンバーシップ確認 → エラーなら早期リターン
4. すべてパスしたら処理を実行

---

## 機能要件

### 型定義

#### Result<S>
- **説明**: 成功または失敗を表すユニオン型
- **優先度**: 高
- **実装状況**: 完了

#### SuccessResult<T>
- **説明**: 成功結果を表す型
- **優先度**: 高
- **実装状況**: 完了

#### ErrorResult
- **説明**: エラー結果を表す型
- **優先度**: 高
- **実装状況**: 完了

### ヘルパー関数

#### success
- **説明**: 成功結果を作成
- **優先度**: 高
- **実装状況**: 完了
- **使用例**:
  ```typescript
  return success(userId);
  return success({ userId, membership });
  return success(void 0); // void返却
  ```

#### error
- **説明**: エラー結果を作成
- **優先度**: 高
- **実装状況**: 完了
- **使用例**:
  ```typescript
  return error("認証が必要です");
  return error("このグループのメンバーではありません");
  return error(`${entityName}が見つかりません`);
  ```

---

## 技術仕様

### ファイル構成

```
convex/types/
└── result.ts
```

### 型定義

```typescript
interface SuccessResult<T> {
  isSuccess: true;
  data: T;
}

interface ErrorResult {
  isSuccess: false;
  errorMessage: string;
}

type Result<S> = SuccessResult<S> | ErrorResult;
```

### 関数シグネチャ

```typescript
/**
 * 成功結果を作成するヘルパー関数
 */
const success = <T>(data: T): SuccessResult<T>

/**
 * エラー結果を作成するヘルパー関数
 */
const error = (errorMessage: string): ErrorResult
```

---

## 使用パターン

### バックエンド（mutation/action）

#### 基本パターン
```typescript
import { error, type Result, success } from "../types/result";

export const updateGroup = zMutation({
  handler: async (ctx, args): Promise<Result<void>> => {
    // 認証チェック
    const authResult = await requireAuth(ctx);
    if (!authResult.isSuccess) return authResult;

    // 処理実行
    await ctx.db.patch(args.groupId, { name: args.name });

    return success(void 0);
  },
});
```

#### データ返却パターン
```typescript
export const createMedicine = zMutation({
  handler: async (ctx, args): Promise<Result<Id<"medicines">>> => {
    const authResult = await requireAuthAndMembership(ctx, args.groupId);
    if (!authResult.isSuccess) return authResult;

    const medicineId = await ctx.db.insert("medicines", {
      name: args.name,
      groupId: args.groupId,
    });

    return success(medicineId);
  },
});
```

#### 複数オブジェクト返却パターン
```typescript
export const getGroupInfo = zMutation({
  handler: async (ctx, args): Promise<Result<{ userId: Id<"users">; membership: Doc<"groupMembers"> }>> => {
    const authResult = await requireAuthAndMembership(ctx, args.groupId);
    if (!authResult.isSuccess) return authResult;

    return success({
      userId: authResult.data.userId,
      membership: authResult.data.membership,
    });
  },
});
```

### フロントエンド

#### 基本的な判定パターン
```typescript
const result = await updateGroup({ groupId, name });

if (!result.isSuccess) {
  // エラー処理
  toast.error(result.errorMessage);
  return;
}

// 成功処理
toast.success("グループを更新しました");
```

#### データ取得パターン
```typescript
const result = await createMedicine({ groupId, name });

if (!result.isSuccess) {
  toast.error(result.errorMessage);
  return;
}

// result.data にアクセス可能
const newMedicineId = result.data;
router.push(`/medicines/${newMedicineId}`);
```

#### TypeScript型推論
```typescript
// result.isSuccess をチェックすると、TypeScriptが型を絞り込む
const result = await createMedicine({ groupId, name });

if (result.isSuccess) {
  // この中では result は SuccessResult<Id<"medicines">> 型
  const medicineId: Id<"medicines"> = result.data;
} else {
  // この中では result は ErrorResult 型
  const message: string = result.errorMessage;
}
```

---

## ビジネスルール

### エラーメッセージルール

1. **日本語で記述**: ユーザーに表示されるため
2. **具体的な内容**: 「エラーが発生しました」ではなく具体的に
3. **対処法を示唆**: 可能な場合は次のアクションを示す

### エラーメッセージ例

| 状況 | メッセージ |
|------|-----------|
| 未認証 | "認証が必要です" |
| 非メンバー | "このグループのメンバーではありません" |
| 存在しない | "グループが見つかりません" |
| 削除済み | "このグループは削除されています" |
| 権限不足 | "この操作を行う権限がありません" |

### 成功結果ルール

1. **voidの場合**: `success(void 0)`を使用
2. **IDの場合**: `success(id)`で直接返却
3. **複数値の場合**: オブジェクトにまとめて`success({ ... })`

---

## テストパターン

### 成功ケースのテスト

```typescript
import { success } from "../types/result";

it("should return success with data", async () => {
  const result = await createMedicine(ctx, { name: "薬A", groupId });

  expect(result.isSuccess).toBe(true);
  if (result.isSuccess) {
    expect(result.data).toBeDefined();
  }
});
```

### エラーケースのテスト

```typescript
import { error } from "../types/result";

it("should return error when not authenticated", async () => {
  // 未認証状態でテスト
  const result = await updateGroup(ctx, { groupId, name: "新名称" });

  expect(result.isSuccess).toBe(false);
  if (!result.isSuccess) {
    expect(result.errorMessage).toBe("認証が必要です");
  }
});
```

### モック生成パターン

```typescript
// 成功モックを作成
const mockSuccess = success({ userId: "user123", membership: mockMembership });

// エラーモックを作成
const mockError = error("テスト用エラー");

// 型アサーション付きモック
const mockResult: Result<Id<"medicines">> = success("medicineId123" as Id<"medicines">);
```

---

## 依存関係

### 内部依存
なし（独立したモジュール）

### 外部依存
なし（純粋なTypeScript型定義）

---

## 関連ドキュメント

- [helpers.md](./helpers.md) - バックエンドヘルパー関数（Result型を使用）
- [error-handling.md](../../error-handling.md) - エラーハンドリング戦略
- [testing-strategy.md](../../testing-strategy.md) - テスト戦略

---

## 実装ファイル

**パス**: `convex/types/result.ts`

**エクスポート型**:
- `Result<S>`: 成功または失敗を表すユニオン型
- `SuccessResult<T>`: 成功結果型（内部的に使用）
- `ErrorResult`: エラー結果型（内部的に使用）

**エクスポート関数**:
- `success<T>(data: T): SuccessResult<T>`
- `error(errorMessage: string): ErrorResult`

---

## 設計の背景

### なぜResult型を採用したか

1. **例外を投げない**: Convexでは例外をスローすると内部エラーになる
2. **型安全**: TypeScriptの型推論で成功/失敗が明確
3. **一貫性**: フロントエンドでの処理パターンが統一される
4. **テスタビリティ**: モック作成が容易

### 代替案との比較

| パターン | メリット | デメリット |
|----------|----------|-----------|
| **Result型（採用）** | 型安全、テスト容易 | 毎回チェックが必要 |
| 例外スロー | シンプル | Convexで使えない |
| null返却 | シンプル | エラー理由が分からない |
| エラーコード | 国際化対応 | 複雑になる |

---

## 既知の課題

現時点で既知の課題はありません。

---

## 変更履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2026年01月25日 | 初版作成 | Claude |
