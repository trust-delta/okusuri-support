#!/usr/bin/env bash
# 関連ドキュメント検索スクリプト
# 使い方: ./scripts/spec-search-related.sh <キーワード1> [キーワード2] [...]
# 例: ./scripts/spec-search-related.sh notification
# 例: ./scripts/spec-search-related.sh medication group

set -euo pipefail

# 引数チェック
if [ $# -eq 0 ]; then
  echo "エラー: 検索キーワードを指定してください。" >&2
  echo "使い方: $0 <キーワード1> [キーワード2] [...]" >&2
  exit 1
fi

# 検索対象ディレクトリ
CONTEXT_DIR=".context"

# ディレクトリ存在チェック
if [ ! -d "$CONTEXT_DIR" ]; then
  echo "エラー: .contextディレクトリが見つかりません: $CONTEXT_DIR" >&2
  exit 1
fi

# 検索キーワードを配列に格納
KEYWORDS=("$@")

echo "=== 関連ドキュメント検索 ==="
echo "キーワード: ${KEYWORDS[*]}"
echo ""

# 結果を格納する一時ファイル
TEMP_FILE=$(mktemp)
trap "rm -f $TEMP_FILE" EXIT

# 各キーワードで検索
for KEYWORD in "${KEYWORDS[@]}"; do
  echo "--- キーワード: $KEYWORD ---"

  # grep で検索（大文字小文字を区別しない、ファイル名のみ表示）
  grep -ril "$KEYWORD" "$CONTEXT_DIR" \
    --include="*.md" \
    --exclude-dir=node_modules \
    --exclude-dir=.git \
    | sort -u \
    >> "$TEMP_FILE" || true
done

# 重複を削除してソート
if [ -s "$TEMP_FILE" ]; then
  echo ""
  echo "=== 検索結果 ==="
  sort -u "$TEMP_FILE" | while read -r FILE; do
    # ファイルの最初の見出しを取得（タイトル）
    TITLE=$(grep -m 1 "^#" "$FILE" 2>/dev/null | sed 's/^#*\s*//' || echo "タイトルなし")

    # 相対パスとタイトルを表示
    echo "📄 $FILE"
    echo "   タイトル: $TITLE"

    # マッチした行数を表示
    MATCH_COUNT=0
    for KEYWORD in "${KEYWORDS[@]}"; do
      COUNT=$(grep -ci "$KEYWORD" "$FILE" || true)
      if [ "$COUNT" -gt 0 ]; then
        MATCH_COUNT=$((MATCH_COUNT + COUNT))
      fi
    done
    echo "   マッチ数: $MATCH_COUNT"
    echo ""
  done
else
  echo "該当するドキュメントが見つかりませんでした。"
fi

# 終了ステータス
exit 0
