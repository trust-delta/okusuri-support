#!/bin/bash
# 変更をコミット（メッセージは引数で指定）
set -e

# 変更があるか確認
if git diff --quiet && git diff --cached --quiet; then
  echo "⚠️  コミットする変更がありません"
  exit 1
fi

# コミットメッセージの確認
if [ $# -eq 0 ]; then
  echo "❌ コミットメッセージが指定されていません"
  echo ""
  echo "使用方法: $0 \"<commit-message>\""
  echo "例: $0 \"feat: 通知機能を実装\""
  echo ""
  echo "📝 現在の変更:"
  git status --short
  exit 1
fi

COMMIT_MESSAGE="$1"

echo "📝 コミットメッセージ:"
echo "$COMMIT_MESSAGE"
echo ""
echo "📋 変更内容:"
git status --short
echo ""

# すべての変更をステージング
echo "📦 変更をステージング中..."
git add .

# コミット実行
echo "💾 コミット実行中..."
git commit -m "$COMMIT_MESSAGE"

echo ""
echo "✅ コミットが完了しました"
echo "📍 最新のコミット:"
git log -1 --oneline
