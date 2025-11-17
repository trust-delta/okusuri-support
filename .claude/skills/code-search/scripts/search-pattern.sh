#!/bin/bash
# 汎用パターン検索

set -e

# 引数チェック
if [ $# -eq 0 ]; then
  echo "使用方法: $0 <pattern> [file-type] [directory]"
  echo ""
  echo "例:"
  echo "  $0 'async function'         # すべてのTSファイルから'async function'を検索"
  echo "  $0 'useQuery' tsx           # TSXファイルから'useQuery'を検索"
  echo "  $0 'error' ts src/features  # src/features内のTSファイルから'error'を検索"
  echo ""
  echo "file-type:"
  echo "  - ts     (TypeScriptファイル)"
  echo "  - tsx    (React TSXファイル)"
  echo "  - all    (すべてのTS/TSXファイル、デフォルト)"
  exit 1
fi

PATTERN=$1
FILE_TYPE=${2:-all}
SEARCH_DIR=${3:-.}

echo "🔍 パターン検索: '$PATTERN'"
echo "   ファイルタイプ: $FILE_TYPE"
echo "   検索ディレクトリ: $SEARCH_DIR"
echo "================================"
echo ""

# ファイルタイプに応じた検索
case $FILE_TYPE in
  ts)
    FILES=$(find "$SEARCH_DIR" -type f -name "*.ts" ! -name "*.d.ts" 2>/dev/null || echo "")
    ;;
  tsx)
    FILES=$(find "$SEARCH_DIR" -type f -name "*.tsx" 2>/dev/null || echo "")
    ;;
  all)
    FILES=$(find "$SEARCH_DIR" -type f \( -name "*.ts" -o -name "*.tsx" \) ! -name "*.d.ts" 2>/dev/null || echo "")
    ;;
  *)
    echo "❌ エラー: file-typeは ts, tsx, all のいずれかである必要があります"
    exit 1
    ;;
esac

if [ -z "$FILES" ]; then
  echo "❌ 検索対象ファイルが見つかりませんでした"
  exit 1
fi

FOUND=false
MATCH_COUNT=0

echo "$FILES" | while read -r FILE; do
  # パターンに一致する行を検索
  MATCHES=$(grep -n "$PATTERN" "$FILE" 2>/dev/null || echo "")

  if [ -n "$MATCHES" ]; then
    FOUND=true
    MATCH_COUNT=$((MATCH_COUNT + 1))

    echo "📄 $FILE"
    echo "  ---"
    echo "$MATCHES" | head -10 | sed 's/^/  /'

    # 10件以上ある場合は省略
    TOTAL_LINES=$(echo "$MATCHES" | wc -l)
    if [ "$TOTAL_LINES" -gt 10 ]; then
      echo "  ... (他 $((TOTAL_LINES - 10)) 件)"
    fi

    echo ""
  fi
done

if [ "$FOUND" = false ]; then
  echo "❌ '$PATTERN'に一致するパターンが見つかりませんでした"
  echo ""
  echo "💡 ヒント:"
  echo "  - パターンを変えてみてください"
  echo "  - 正規表現が使用できます（grep -E相当）"
else
  echo "================================"
  echo "✨ 検索完了"
fi
