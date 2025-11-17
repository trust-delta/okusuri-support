#!/bin/bash
# 機能ブランチを作成してチェックアウト
set -e

# 引数チェック
if [ $# -lt 2 ]; then
  echo "使用方法: $0 <branch-type> <branch-name>"
  echo "例: $0 feature notification"
  echo "ブランチタイプ: feature, fix, chore, refactor"
  exit 1
fi

BRANCH_TYPE=$1
BRANCH_NAME=$2
FULL_BRANCH_NAME="${BRANCH_TYPE}/${BRANCH_NAME}"

# 現在のブランチを保存
CURRENT_BRANCH=$(git branch --show-current)

echo "📋 現在のブランチ: $CURRENT_BRANCH"
echo "🔀 作成するブランチ: $FULL_BRANCH_NAME"

# developブランチが存在するか確認
if ! git rev-parse --verify develop >/dev/null 2>&1; then
  echo "⚠️  developブランチが存在しません。現在のブランチから作成します。"
  BASE_BRANCH=$CURRENT_BRANCH
else
  BASE_BRANCH="develop"
  # developブランチの最新を取得
  echo "🔄 developブランチを最新に更新中..."
  git checkout develop
  git pull origin develop
fi

# ブランチが既に存在するか確認
if git rev-parse --verify "$FULL_BRANCH_NAME" >/dev/null 2>&1; then
  echo "⚠️  ブランチ $FULL_BRANCH_NAME は既に存在します。"
  echo "既存のブランチにチェックアウトしますか？ (y/n)"
  read -r response
  if [[ "$response" =~ ^[Yy]$ ]]; then
    git checkout "$FULL_BRANCH_NAME"
    echo "✅ ブランチ $FULL_BRANCH_NAME にチェックアウトしました"
  else
    echo "❌ 処理を中断しました"
    exit 1
  fi
else
  # 新しいブランチを作成してチェックアウト
  git checkout -b "$FULL_BRANCH_NAME"
  echo "✅ ブランチ $FULL_BRANCH_NAME を作成しました"
fi

echo ""
echo "📍 現在のブランチ: $(git branch --show-current)"
