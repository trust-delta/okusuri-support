# アクセシビリティチェック

UIコンポーネントのアクセシビリティ（a11y）をチェックします。

## チェック項目

### 1. ARIA属性

#### チェック内容
- インタラクティブ要素に適切なrole属性
- プログレスバーやメーターに `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- 動的コンテンツに `aria-live` 属性
- 装飾的アイコンに `aria-hidden="true"`

#### 検出パターン
```tsx
// ❌ Bad - プログレスバーにARIA属性なし
<div className="progress-bar">
  <div style={{ width: `${value}%` }} />
</div>

// ✅ Good
<div
  role="progressbar"
  aria-valuenow={value}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label="進捗状況"
  className="progress-bar"
>
  <div style={{ width: `${value}%` }} />
</div>
```

---

### 2. セマンティックHTML

#### チェック内容
- 適切な見出し階層（h1 → h2 → h3）
- リストには `<ul>`, `<ol>`, `<li>` を使用
- ナビゲーションには `<nav>` を使用
- フォーム要素に `<label>` を関連付け

#### 検出パターン
```tsx
// ❌ Bad
<div className="heading">タイトル</div>
<div onClick={handleClick}>ボタン</div>

// ✅ Good
<h2>タイトル</h2>
<button onClick={handleClick}>ボタン</button>
```

---

### 3. キーボード操作

#### チェック内容
- フォーカス可能な要素に適切な `tabIndex`
- カスタムコンポーネントでのキーボードイベント対応
- フォーカス状態の視覚的表示
- フォーカストラップ（モーダル内）

#### 検出パターン
```tsx
// ❌ Bad - divをボタンとして使用
<div onClick={handleClick} className="button">
  クリック
</div>

// ✅ Good
<button onClick={handleClick} className="button">
  クリック
</button>

// または
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
  className="button"
>
  クリック
</div>
```

---

### 4. カラーコントラスト

#### チェック内容
- テキストと背景のコントラスト比（WCAG AA: 4.5:1以上）
- 大きなテキスト（3:1以上）
- 色だけに依存しない情報伝達

#### 注意すべきパターン
```tsx
// ⚠️ 注意 - 色だけで状態を表現
<span className={isError ? "text-red-500" : "text-green-500"}>
  {status}
</span>

// ✅ Good - アイコンやテキストも併用
<span className={isError ? "text-red-500" : "text-green-500"}>
  {isError ? "❌ エラー" : "✅ 成功"}: {status}
</span>
```

---

### 5. 画像とメディア

#### チェック内容
- 意味のある画像に `alt` 属性
- 装飾的画像に `alt=""` または `aria-hidden="true"`
- 動画に字幕/代替テキスト

#### 検出パターン
```tsx
// ❌ Bad
<img src="/user.png" />
<Icon icon={PillIcon} />

// ✅ Good
<img src="/user.png" alt="ユーザーアバター" />
<Icon icon={PillIcon} aria-hidden="true" />
// または意味がある場合
<Icon icon={PillIcon} aria-label="薬" />
```

---

### 6. フォーム

#### チェック内容
- 入力フィールドに `<label>` を関連付け
- エラーメッセージの関連付け（`aria-describedby`）
- 必須フィールドの明示（`aria-required`）
- 入力形式のヒント

#### 検出パターン
```tsx
// ❌ Bad
<input type="email" placeholder="メールアドレス" />

// ✅ Good
<div>
  <label htmlFor="email">メールアドレス</label>
  <input
    id="email"
    type="email"
    aria-required="true"
    aria-describedby="email-error"
  />
  {error && <span id="email-error" role="alert">{error}</span>}
</div>
```

---

## 実行フロー

### 1. 変更ファイルの取得
```bash
git diff main...HEAD --name-only | grep -E '\.(tsx?|jsx?)$'
```

### 2. 各コンポーネントのチェック
1. JSX/TSXファイルを読み込み
2. 上記パターンを検出
3. 問題点をリストアップ

### 3. 結果レポート
```markdown
### アクセシビリティチェック結果

#### 🔴 Critical
- src/components/ProgressBar.tsx:15 - プログレスバーにrole/aria属性なし
- src/components/Modal.tsx:42 - モーダルにフォーカストラップなし

#### 🟡 Warning
- src/features/history/MonthlyStats.tsx:89 - アイコンにaria-hiddenなし
- src/components/Form.tsx:23 - labelとinputの関連付けなし

#### 🔵 Info
- src/components/Card.tsx:8 - 見出し階層の確認を推奨
```

---

## 医療アプリ特有の考慮事項

医療アプリでは特に以下の点に注意：

1. **高齢者への配慮**
   - 十分なフォントサイズ（16px以上推奨）
   - タッチターゲットの十分な大きさ（44x44px以上）
   - 明確なコントラスト

2. **緊急情報の伝達**
   - 警告・エラーは色だけでなくアイコンやテキストでも表現
   - 重要な通知には `aria-live="assertive"` を使用

3. **服薬情報の明確さ**
   - 数値情報は読み上げで理解しやすい形式に
   - 時間帯の表現は明確に（朝/昼/晩/就寝前）

---

## 参考リソース

- [WCAG 2.1 ガイドライン](https://www.w3.org/TR/WCAG21/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Radix UI Accessibility](https://www.radix-ui.com/docs/primitives/overview/accessibility)

---

**最終更新**: 2025年11月30日
