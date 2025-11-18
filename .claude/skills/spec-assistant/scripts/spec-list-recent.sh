#!/usr/bin/env bash
# 最新仕様書一覧取得スクリプト
# 使い方: ./scripts/spec-list-recent.sh [件数] [タイプ]
# 例: ./scripts/spec-list-recent.sh 5 features
# 例: ./scripts/spec-list-recent.sh 3 api

set -euo pipefail

# デフォルト値
COUNT="${1:-5}"
TYPE="${2:-all}"

# プロジェクトルートからの相対パスを想定
SPECS_DIR=".context/specs"

# タイプに応じたディレクトリを決定
case "$TYPE" in
  features)
    SEARCH_DIR="$SPECS_DIR/features"
    ;;
  api)
    SEARCH_DIR="$SPECS_DIR/api"
    ;;
  all)
    SEARCH_DIR="$SPECS_DIR"
    ;;
  *)
    echo "エラー: 不正なタイプです。'features', 'api', または 'all' を指定してください。" >&2
    exit 1
    ;;
esac

# ディレクトリ存在チェック
if [ ! -d "$SEARCH_DIR" ]; then
  echo "エラー: ディレクトリが見つかりません: $SEARCH_DIR" >&2
  exit 1
fi

# 最新の仕様書を更新日時順にソートして取得
# - .mdファイルのみ
# - templates/ ディレクトリを除外
# - 更新日時の新しい順
# - 指定件数分取得
find "$SEARCH_DIR" -type f -name "*.md" ! -path "*/templates/*" -printf '%T@ %p\n' \
  | sort -rn \
  | head -n "$COUNT" \
  | cut -d' ' -f2-

# 終了ステータス
exit 0
