#!/bin/bash
# 機能ブランチ + worktree作成スクリプト
#
# Usage: ./scripts/new-feature-worktree.sh <branch-name>
# Example: ./scripts/new-feature-worktree.sh feature/add-notification

set -e

# 引数チェック
if [ -z "$1" ]; then
  echo "Usage: $0 <branch-name>"
  echo "Example: $0 feature/add-notification"
  exit 1
fi

BRANCH_NAME="$1"
BASE_BRANCH="develop"
PROJECT_ROOT=$(git rev-parse --show-toplevel)
PROJECT_NAME=$(basename "$PROJECT_ROOT")
WORKTREE_DIR="$(dirname "$PROJECT_ROOT")/${PROJECT_NAME}-$(echo "$BRANCH_NAME" | tr '/' '-')"

# 既にworktreeが存在するかチェック
if [ -d "$WORKTREE_DIR" ]; then
  echo "Error: Worktree already exists at $WORKTREE_DIR"
  echo "To remove: git worktree remove $WORKTREE_DIR"
  exit 1
fi

# developの最新を取得
echo "Fetching latest $BASE_BRANCH..."
git fetch origin "$BASE_BRANCH"

# ブランチが既に存在するかチェック
if git show-ref --verify --quiet "refs/heads/$BRANCH_NAME"; then
  echo "Branch '$BRANCH_NAME' already exists. Creating worktree with existing branch..."
  git worktree add "$WORKTREE_DIR" "$BRANCH_NAME"
else
  echo "Creating new branch '$BRANCH_NAME' from $BASE_BRANCH..."
  git worktree add -b "$BRANCH_NAME" "$WORKTREE_DIR" "origin/$BASE_BRANCH"
fi

echo ""
echo "Worktree created at: $WORKTREE_DIR"
echo "Branch: $BRANCH_NAME (based on $BASE_BRANCH)"
echo ""
echo "To start working:"
echo "  cd $WORKTREE_DIR"
