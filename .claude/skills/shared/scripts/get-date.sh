#!/usr/bin/env bash
# JST日付取得スクリプト（共通ユーティリティ）
# 使い方: ./get-date.sh [format]
# 例: ./get-date.sh           # デフォルト: YYYY-MM-DD
# 例: ./get-date.sh full      # YYYY年MM月DD日 HH:MM:SS JST
# 例: ./get-date.sh iso       # YYYY-MM-DDTHH:MM:SS+09:00

set -euo pipefail

FORMAT="${1:-default}"

case "$FORMAT" in
  default)
    TZ='Asia/Tokyo' date '+%Y-%m-%d'
    ;;
  full)
    TZ='Asia/Tokyo' date '+%Y年%m月%d日 %H:%M:%S JST'
    ;;
  iso)
    TZ='Asia/Tokyo' date '+%Y-%m-%dT%H:%M:%S+09:00'
    ;;
  japanese)
    TZ='Asia/Tokyo' date '+%Y年%m月%d日'
    ;;
  *)
    echo "エラー: 不正なフォーマットです。'default', 'full', 'iso', または 'japanese' を指定してください。" >&2
    exit 1
    ;;
esac
