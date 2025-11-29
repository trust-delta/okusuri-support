# パフォーマンスチェック

パフォーマンス問題をチェックします。

## チェック項目

### 1. 不要な再レンダリング

#### チェック内容
- useCallbackの適切な使用
- useMemoの適切な使用
- React.memoの適切な使用
- 依存配列の正確性

#### 検出パターン
```typescript
// ❌ Bad
function Parent() {
  const handleClick = () => {};  // 毎回新しい関数が作成される
  return <Child onClick={handleClick} />;
}

// ✅ Good
function Parent() {
  const handleClick = useCallback(() => {}, []);
  return <Child onClick={handleClick} />;
}
```

---

### 2. 重い計算

#### チェック内容
- ループ内での重い処理
- 不要な計算の繰り返し
- メモ化の機会

#### 検出パターン
```typescript
// ❌ Bad
function Component({ items }) {
  const sorted = items.sort((a, b) => a.name.localeCompare(b.name));
  return <List items={sorted} />;
}

// ✅ Good
function Component({ items }) {
  const sorted = useMemo(
    () => items.sort((a, b) => a.name.localeCompare(b.name)),
    [items]
  );
  return <List items={sorted} />;
}
```

---

### 3. N+1問題

#### チェック内容
- ループ内でのクエリ
- 関連データの一括取得
- バッチ処理の活用

#### 検出パターン
```typescript
// ❌ Bad
for (const user of users) {
  const posts = await db.query("posts").filter("userId", user._id);
}

// ✅ Good
const userIds = users.map(u => u._id);
const posts = await db.query("posts").filter("userId", "in", userIds);
```

---

### 4. バンドルサイズ

#### チェック内容
- 大きなライブラリのインポート
- Tree-shakingの活用
- 動的インポートの活用

#### 検出パターン
```typescript
// ❌ Bad
import _ from "lodash";
const result = _.map(items, fn);

// ✅ Good
import map from "lodash/map";
const result = map(items, fn);
```

---

### 5. 画像最適化

#### チェック内容
- next/imageの使用
- 適切なサイズ指定
- lazy loadingの活用

#### 検出パターン
```typescript
// ❌ Bad
<img src="/large-image.png" />

// ✅ Good
import Image from "next/image";
<Image
  src="/large-image.png"
  width={800}
  height={600}
  loading="lazy"
/>
```

---

### 6. API呼び出し

#### チェック内容
- 不要なAPI呼び出し
- キャッシュの活用
- デバウンス/スロットル

#### 検出パターン
```typescript
// ❌ Bad
function SearchInput() {
  const [query, setQuery] = useState("");
  useEffect(() => {
    fetch(`/api/search?q=${query}`);
  }, [query]);
}

// ✅ Good
function SearchInput() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  useEffect(() => {
    if (debouncedQuery) {
      fetch(`/api/search?q=${debouncedQuery}`);
    }
  }, [debouncedQuery]);
}
```

---

## パフォーマンス計測ツール

| ツール | 用途 |
|--------|------|
| React DevTools Profiler | レンダリング分析 |
| Lighthouse | 総合的なパフォーマンス |
| Bundle Analyzer | バンドルサイズ分析 |
| Network DevTools | API呼び出し分析 |

---

## 実行フロー

### 1. 変更ファイルの取得
```bash
git diff main...HEAD --name-only
```

### 2. パフォーマンスパターンの検索
各チェック項目のパターンを検索

### 3. 結果レポート
```markdown
### パフォーマンスチェック結果

#### 🔴 Critical
- src/features/medication/list.tsx:42 - N+1クエリの可能性

#### 🟡 Warning
- src/components/Modal.tsx:15 - useCallbackの欠落

#### 🔵 Info
- src/pages/dashboard.tsx - 画像の最適化を推奨
```
