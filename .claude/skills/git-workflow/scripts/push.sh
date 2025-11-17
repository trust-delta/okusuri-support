#!/bin/bash
# 現在のブランチをリモートにプッシュ
set -e

# 現在のブランチを取得
CURRENT_BRANCH=$(git branch --show-current)

if [ -z "$CURRENT_BRANCH" ]; then
  echo "❌ ブランチ情報を取得できませんでした"
  exit 1
fi

echo "📍 現在のブランチ: $CURRENT_BRANCH"

# コミットがあるか確認
if ! git log -1 >/dev/null 2>&1; then
  echo "❌ コミットがありません。先にコミットしてください。"
  exit 1
fi

# リモート追跡ブランチがあるか確認
if git rev-parse --abbrev-ref --symbolic-full-name @{u} >/dev/null 2>&1; then
  echo "🔄 リモートブランチに変更をプッシュ中..."
  git push
else
  echo "🚀 新しいリモートブランチを作成してプッシュ中..."
  git push -u origin "$CURRENT_BRANCH"
fi

echo ""
echo "✅ プッシュが完了しました"
echo "🌐 リモートブランチ: origin/$CURRENT_BRANCH"
