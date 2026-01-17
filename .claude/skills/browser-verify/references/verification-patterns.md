# 検証パターン集

## ログイン検証（認証必須ページ用）

固定テストアカウントでログインしてから検証する。

```
1. navigate_page("http://localhost:3000/login")
2. take_snapshot() でログイン画面確認
3. click("メールアドレスでログイン" ボタン)
4. take_snapshot() でパスワード入力フォーム確認
5. fill(emailフィールド, "test@example.com")
6. fill(passwordフィールド, "TestPassword123!")
7. click(送信ボタン)
8. take_snapshot() でOTP入力画面確認
9. 各OTP入力フィールドに "12345678" を1桁ずつ入力
10. click(確認ボタン)
11. take_snapshot() でダッシュボード表示確認
12. list_console_messages() でエラー確認
```

**テストアカウント情報**:
- Email: `test@example.com`
- Password: `TestPassword123!`（8文字以上なら何でも可）
- OTP: `12345678`（固定）

**注意**: OTP入力は8つの個別フィールドに1桁ずつ入力する。

---

## ページ巡回検証

全ページを巡回してエラーを検出する。

```
1. list_pages() でルート一覧取得（またはsitemap/router定義から）
2. 各ページに対して:
   - navigate_page(url)
   - take_snapshot()
   - list_console_messages()
   - エラーがあれば記録
3. 結果サマリーを出力
```

## フォーム検証

フォームの入力→送信→結果確認。

```
1. navigate_page(フォームページ)
2. take_snapshot() で入力フィールド確認
3. fill(ref, value) で各フィールド入力
4. click(送信ボタンref)
5. take_snapshot() で結果確認
6. list_console_messages() でエラー確認
```

## ナビゲーション検証

リンク・ボタンの遷移確認。

```
1. navigate_page(起点ページ)
2. take_snapshot() でリンク/ボタン確認
3. click(ref) でクリック
4. take_snapshot() で遷移先確認
5. URL/タイトル/コンテンツが期待通りか確認
```

## 状態変化検証

操作による状態変化の確認。

```
1. take_snapshot() で初期状態
2. click/fill で操作
3. take_snapshot() で変化後状態
4. 差分を確認（要素の追加/削除/変更）
```

## エラーパターン

### Criticalエラー（即修正）

- `Uncaught TypeError`
- `Uncaught ReferenceError`
- `Uncaught SyntaxError`
- `ChunkLoadError`
- `Failed to fetch`
- `NetworkError`
- 空白画面（要素が0個）

### Warningエラー（報告）

- `Warning:`
- `Deprecation:`
- `[Violation]`

### 無視可能

- `autocomplete` 属性警告
- `form field id/name` 警告
- DevTools関連のメッセージ

## 修正サイクル

```
エラー検知
    ↓
エラーメッセージからファイル/行特定
    ↓
該当コード修正
    ↓
HMRで自動リロード or 手動リロード
    ↓
再検証（同じページ）
    ↓
エラー解消確認
```
