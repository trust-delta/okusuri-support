# コード品質チェック

変更されたコードの品質をチェックします。

## チェック項目

### 1. 型安全性

#### チェック内容
- `any` 型の使用なし
- 適切な型定義
- 型アサーション（as）の最小化
- unknown型の適切な使用

#### 検出パターン
```typescript
// ❌ Bad
const data: any = fetchData();
const user = response as User;

// ✅ Good
const data: UserData = fetchData();
const user = validateUser(response);
```

---

### 2. エラーハンドリング

#### チェック内容
- try-catchの適切な使用
- エラーメッセージの明確さ
- エラーの再スロー
- ユーザーへのフィードバック

#### 検出パターン
```typescript
// ❌ Bad
try {
  await saveData();
} catch (e) {
  console.log(e);
}

// ✅ Good
try {
  await saveData();
} catch (error) {
  console.error("Failed to save data:", error);
  toast.error("保存に失敗しました");
  throw error;
}
```

---

### 3. 命名規則

#### チェック内容
- 変数名は説明的か
- 関数名は動詞で始まるか
- コンポーネント名はPascalCaseか
- 定数名はUPPER_SNAKE_CASEか

#### 検出パターン
```typescript
// ❌ Bad
const d = new Date();
const data = fetchUsers();
function process() {}

// ✅ Good
const createdAt = new Date();
const users = fetchUsers();
function processUserData() {}
```

---

### 4. コードの重複

#### チェック内容
- 類似コードの存在
- 共通化の可能性
- ユーティリティ関数の活用

#### 検出方法
```bash
# 類似コードを検索
Grep: pattern="<同じパターン>" path="src/"
```

---

### 5. コメント

#### チェック内容
- JSDocコメントの存在（公開API）
- TODOコメントの適切な使用
- 不要なコメントの削除
- 複雑なロジックへの説明

#### 検出パターン
```typescript
// ❌ Bad
// インクリメント
i++;

// ✅ Good
/**
 * 服薬記録を作成する
 * @param medicationId - 薬のID
 * @param takenAt - 服薬日時
 */
function createMedicationLog(medicationId: string, takenAt: Date) {}
```

---

## 実行フロー

### 1. 変更ファイルの取得
```bash
git diff main...HEAD --name-only
```

### 2. 各ファイルのチェック
1. ファイルを読み込み
2. 上記パターンを検出
3. 問題点をリストアップ

### 3. 結果レポート
```markdown
### コード品質チェック結果

#### 🔴 Critical
- src/features/auth/lib/session.ts:42 - any型の使用

#### 🟡 Warning
- src/components/Button.tsx:15 - 曖昧な変数名 `data`

#### 🔵 Info
- src/utils/format.ts:8 - JSDocコメントの追加を推奨
```
