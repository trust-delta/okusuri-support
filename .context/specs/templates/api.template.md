# [機能名] API仕様

**最終更新**: [YYYY年MM月DD日]

## 概要
[この機能が提供するAPIの概要を1-2文で記述]

---

## Queries（データ取得）

### `[関数名]`

**用途**: [この関数の目的を1行で説明]

**認証**: [必須/任意/不要]

**引数**:
```typescript
{
  [argName]: [type], // [説明]
}
```

**戻り値**:
```typescript
{
  [field]: [type], // [説明]
}
```

**エラー**:
- `"[エラーメッセージ]"` - [発生条件]

**例**:
```typescript
const result = await ctx.runQuery(api.[feature].[functionName], {
  argName: value,
});
```

---

## Mutations（データ更新）

### `[関数名]`

**用途**: [この関数の目的を1行で説明]

**認証**: [必須/任意/不要]

**引数**:
```typescript
{
  [argName]: [type], // [説明]
}
```

**戻り値**:
```typescript
[returnType] // [説明]
```

**バリデーション**:
1. [バリデーションルール1]
2. [バリデーションルール2]

**副作用**:
- [データベーステーブル名]: [作成/更新/削除]
- [その他の副作用があれば記載]

**エラー**:
- `"[エラーメッセージ]"` - [発生条件]

**例**:
```typescript
const result = await ctx.runMutation(api.[feature].[functionName], {
  argName: value,
});
```

---

## Actions（外部連携）

### `[関数名]`

**用途**: [この関数の目的を1行で説明]

**認証**: [必須/任意/不要]

**引数**:
```typescript
{
  [argName]: [type], // [説明]
}
```

**戻り値**:
```typescript
{
  [field]: [type], // [説明]
}
```

**処理フロー**:
1. [ステップ1]
2. [ステップ2]
3. [ステップ3]

**リトライ**:
- 最大試行回数: [回数]
- リトライ条件: [条件]

**エラー**:
- `"[エラーメッセージ]"` - [発生条件]

**例**:
```typescript
const result = await ctx.runAction(api.[feature].[functionName], {
  argName: value,
});
```

---

## 内部関数（Internal）

### `[関数名]Internal`

**用途**: [この関数の目的を1行で説明]

**認証**: [必須/任意/不要]

**引数**:
```typescript
{
  [argName]: [type], // [説明]
}
```

**戻り値**:
```typescript
[returnType] // [説明]
```

**注意**: この関数は内部使用のみ。クライアントから直接呼び出さないこと。

---

## データモデル

### 主要テーブル

**`[テーブル名]`**:
```typescript
{
  _id: Id<"[テーブル名]">,
  [field1]: [type], // [説明]
  [field2]: [type], // [説明]
  createdAt: number,
  updatedAt?: number,
}
```

**インデックス**:
- `by_[field]`: `[field]` による検索用

---

## 認可ルール

| 操作 | Patient | Supporter | 条件 |
|------|---------|-----------|------|
| [操作名] | ✅/❌ | ✅/❌ | [追加条件があれば] |

---

## ユースケース

### ケース1: [タイトル]

**シナリオ**: [1-2文でシナリオ説明]

**手順**:
1. `[関数名]` を呼び出し
2. [次の処理]
3. [完了条件]

**コード例**:
```typescript
// [コード例]
```

---

## テストケース

### 正常系

- [ ] [テストケース1の説明]
- [ ] [テストケース2の説明]

### 異常系

- [ ] 未認証ユーザーはエラー
- [ ] 権限不足の場合はエラー
- [ ] [その他の異常系]

---

## 関連ドキュメント

- [API設計規約](../api/conventions.md)
- [機能仕様](../features/[feature].md)
- [プロジェクト概要](../../project.md)
