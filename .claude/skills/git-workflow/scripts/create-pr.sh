#!/bin/bash
# プルリクエストを作成
set -e

# gh CLIがインストールされているか確認
if ! command -v gh &> /dev/null; then
  echo "❌ gh CLIがインストールされていません"
  echo "インストール方法: https://cli.github.com/"
  exit 1
fi

# 認証確認
if ! gh auth status &> /dev/null; then
  echo "❌ GitHub CLIが認証されていません"
  echo "実行してください: gh auth login"
  exit 1
fi

# 引数チェック
if [ $# -lt 2 ]; then
  echo "使用方法: $0 \"<PR-title>\" \"<PR-body>\""
  echo "例: $0 \"feat: 通知機能を追加\" \"## 概要\n通知機能を実装しました\""
  exit 1
fi

PR_TITLE="$1"
PR_BODY="$2"
BASE_BRANCH="${3:-develop}"  # デフォルトはdevelop

# 現在のブランチを取得
CURRENT_BRANCH=$(git branch --show-current)

echo "📍 現在のブランチ: $CURRENT_BRANCH"
echo "🎯 ベースブランチ: $BASE_BRANCH"
echo "📝 PRタイトル: $PR_TITLE"
echo ""

# PRを作成
echo "🚀 プルリクエストを作成中..."
PR_URL=$(gh pr create \
  --base "$BASE_BRANCH" \
  --head "$CURRENT_BRANCH" \
  --title "$PR_TITLE" \
  --body "$PR_BODY")

echo ""
echo "✅ プルリクエストが作成されました"
echo "🔗 URL: $PR_URL"
