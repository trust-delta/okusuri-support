#!/usr/bin/env bash
# テンプレート一覧取得スクリプト
# 使い方: ./scripts/spec-list-templates.sh [タイプ]
# 例: ./scripts/spec-list-templates.sh feature
# 例: ./scripts/spec-list-templates.sh api

set -euo pipefail

# デフォルト値
TYPE="${1:-all}"

# プロジェクトルートからの相対パスを想定
TEMPLATES_DIR=".context/specs/templates"

# ディレクトリ存在チェック
if [ ! -d "$TEMPLATES_DIR" ]; then
  echo "エラー: テンプレートディレクトリが見つかりません: $TEMPLATES_DIR" >&2
  exit 1
fi

# タイプに応じたテンプレートを検索
case "$TYPE" in
  feature)
    find "$TEMPLATES_DIR" -type f -name "feature*.md" -o -name "*feature*.template.md"
    ;;
  api)
    find "$TEMPLATES_DIR" -type f -name "api*.md" -o -name "*api*.template.md"
    ;;
  all)
    find "$TEMPLATES_DIR" -type f -name "*.md"
    ;;
  *)
    echo "エラー: 不正なタイプです。'feature', 'api', または 'all' を指定してください。" >&2
    exit 1
    ;;
esac

# 終了ステータス
exit 0
