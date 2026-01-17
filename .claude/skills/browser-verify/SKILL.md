---
name: browser-verify
description: |
  Chrome DevTools MCPを使った実装検証・自動修正スキル。
  トリガー: 「chromeで確認して」「ブラウザで動作確認」「実装を確認して修正して」
  「機能が動くか確認」「コンソールエラーを確認」「画面を確認」
  開発サーバー起動→Chrome接続→ページ巡回→エラー検知→修正→再確認のサイクルを実行。
---

# Browser Verify Skill

Chrome DevTools MCPで実装を検証し、問題があれば修正するスキル。

## 前提条件

- Chrome DevTools MCP設定済み (`--browser-url=http://127.0.0.1:9222`)
- 開発サーバー起動可能 (`npm run dev` etc.)
- テストアカウント設定済み（Convex環境変数）

## テストアカウント

認証が必要なページの検証には固定テストアカウントを使用する。

| 項目 | 値 |
|------|-----|
| Email | `test@example.com` |
| Password | 任意（8文字以上、例: `TestPassword123!`） |
| OTP | `12345678` |

**設定場所**: `e2e/helpers/fixtures.ts`

## 検証フロー

### 1. 環境準備

```bash
# Chrome起動（未起動の場合）
bash scripts/start_chrome.sh
# 出力に "CHROME_READY" が含まれていれば成功
# 含まれていなければ再実行

# 開発サーバー起動
npm run dev &
```

**起動確認**: スクリプト実行後、`CHROME_READY` が出力されることを確認。タイムアウト時は `CHROME_FAILED` が出力される。

### 2. 基本検証サイクル

```
navigate_page(url)
    ↓
take_snapshot() → DOM構造確認
    ↓
list_console_messages() → エラー検知
    ↓
エラーあり？
  ├─ Yes → コード修正 → 再検証
  └─ No → 次ページ or 完了
```

### 3. 機能検証（操作必要時）

```
click(ref) / fill(ref, text) → 操作
    ↓
take_snapshot() → 状態変化確認
    ↓
list_console_messages() → エラー検知
```

## エラー優先度

| 優先度 | 種類 | 対応 |
|--------|------|------|
| Critical | Uncaught Error, 例外 | 即修正 |
| Warning | console.warn, deprecation | 報告 |
| Info | autocomplete属性等 | 無視可 |

## 主要MCPツール

| ツール | 用途 |
|--------|------|
| `navigate_page` | URL移動 |
| `take_snapshot` | DOM構造取得 |
| `take_screenshot` | 視覚的確認 |
| `list_console_messages` | コンソールエラー取得 |
| `click` | 要素クリック |
| `fill` | テキスト入力 |

## 検証パターン

詳細は `references/verification-patterns.md` を参照。
