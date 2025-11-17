#!/bin/bash
# ブランチ作成 → コミット → プッシュ → PR作成を一括実行
set -e

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 引数チェック
if [ $# -lt 4 ]; then
  echo "使用方法: $0 <branch-type> <branch-name> \"<commit-message>\" \"<PR-title>\" \"<PR-body>\" [base-branch]"
  echo ""
  echo "例:"
  echo "  $0 feature notification \\"
  echo "    \"feat: 通知機能を実装\" \\"
  echo "    \"feat: 通知機能を追加\" \\"
  echo "    \"## 概要\n通知機能を実装しました\""
  echo ""
  echo "引数:"
  echo "  branch-type: feature, fix, chore, refactor"
  echo "  branch-name: ブランチ名（kebab-case推奨）"
  echo "  commit-message: コミットメッセージ（日本語OK）"
  echo "  PR-title: PRのタイトル"
  echo "  PR-body: PRの本文（改行は\\nで指定）"
  echo "  base-branch: マージ先ブランチ（省略時: develop）"
  exit 1
fi

BRANCH_TYPE=$1
BRANCH_NAME=$2
COMMIT_MESSAGE=$3
PR_TITLE=$4
PR_BODY=$5
BASE_BRANCH=${6:-develop}

echo "🚀 Git ワークフロー一括実行"
echo "================================"
echo ""

# ステップ1: ブランチ作成
echo "📌 ステップ1: ブランチ作成"
echo "---"
"$SCRIPT_DIR/create-branch.sh" "$BRANCH_TYPE" "$BRANCH_NAME"
echo ""

# ステップ2: コミット
echo "📌 ステップ2: コミット"
echo "---"
"$SCRIPT_DIR/commit.sh" "$COMMIT_MESSAGE"
echo ""

# ステップ3: プッシュ
echo "📌 ステップ3: プッシュ"
echo "---"
"$SCRIPT_DIR/push.sh"
echo ""

# ステップ4: PR作成
echo "📌 ステップ4: PR作成"
echo "---"
"$SCRIPT_DIR/create-pr.sh" "$PR_TITLE" "$PR_BODY" "$BASE_BRANCH"
echo ""

echo "================================"
echo "✨ すべてのステップが完了しました！"
