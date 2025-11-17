#!/bin/bash
# Reactコンポーネントを検索

set -e

# 引数チェック
if [ $# -eq 0 ]; then
  echo "使用方法: $0 <search-keyword> [directory]"
  echo ""
  echo "例:"
  echo "  $0 List                    # 'List'を含むコンポーネントを検索"
  echo "  $0 Button src/features     # src/features内の'Button'を含むコンポーネントを検索"
  echo ""
  echo "検索対象:"
  echo "  - src/features/*/components/*.tsx"
  echo "  - src/components/*.tsx"
  echo "  - src/shared/components/*.tsx"
  exit 1
fi

KEYWORD=$1
SEARCH_DIR=${2:-.}

echo "🔍 コンポーネント検索: '$KEYWORD'"
echo "================================"
echo ""

# 検索パターン
PATTERNS=(
  "$SEARCH_DIR/src/features/*/components/*$KEYWORD*.tsx"
  "$SEARCH_DIR/src/components/*$KEYWORD*.tsx"
  "$SEARCH_DIR/src/shared/components/*$KEYWORD*.tsx"
)

FOUND=false

for PATTERN in "${PATTERNS[@]}"; do
  # shellを使ってglobを展開
  FILES=$(find $(dirname $PATTERN 2>/dev/null || echo "/dev/null") -name "$(basename $PATTERN)" 2>/dev/null || echo "")

  if [ -n "$FILES" ]; then
    FOUND=true
    echo "📁 パターン: $PATTERN"
    echo "$FILES" | while read -r FILE; do
      if [ -f "$FILE" ]; then
        echo "  ✓ $FILE"

        # ファイルの最初の数行を表示（コンポーネント定義部分）
        echo "    ---"
        head -20 "$FILE" | grep -E "(export |function |const |interface |type )" | head -5 | sed 's/^/    /'
        echo ""
      fi
    done
  fi
done

if [ "$FOUND" = false ]; then
  echo "❌ '$KEYWORD'に一致するコンポーネントが見つかりませんでした"
  echo ""
  echo "💡 ヒント:"
  echo "  - キーワードを変えてみてください"
  echo "  - 部分一致で検索されます（例: 'List' → 'UserList', 'TodoList'）"
else
  echo "================================"
  echo "✨ 検索完了"
fi
