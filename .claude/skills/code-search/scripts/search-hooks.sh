#!/bin/bash
# カスタムフックを検索

set -e

# 引数チェック
if [ $# -eq 0 ]; then
  echo "使用方法: $0 <search-keyword> [directory]"
  echo ""
  echo "例:"
  echo "  $0 useUser                 # 'useUser'を含むフックを検索"
  echo "  $0 use src/features        # src/features内の'use'を含むフックを検索"
  echo ""
  echo "検索対象:"
  echo "  - src/features/*/hooks/*.ts"
  echo "  - src/features/*/hooks/*.tsx"
  echo "  - src/shared/hooks/*.ts"
  exit 1
fi

KEYWORD=$1
SEARCH_DIR=${2:-.}

echo "🔍 カスタムフック検索: '$KEYWORD'"
echo "================================"
echo ""

# 検索パターン
PATTERNS=(
  "$SEARCH_DIR/src/features/*/hooks/*$KEYWORD*.ts"
  "$SEARCH_DIR/src/features/*/hooks/*$KEYWORD*.tsx"
  "$SEARCH_DIR/src/shared/hooks/*$KEYWORD*.ts"
  "$SEARCH_DIR/src/shared/hooks/*$KEYWORD*.tsx"
)

FOUND=false

for PATTERN in "${PATTERNS[@]}"; do
  FILES=$(find $(dirname $PATTERN 2>/dev/null || echo "/dev/null") -name "$(basename $PATTERN)" 2>/dev/null || echo "")

  if [ -n "$FILES" ]; then
    FOUND=true
    echo "📁 パターン: $PATTERN"
    echo "$FILES" | while read -r FILE; do
      if [ -f "$FILE" ]; then
        echo "  ✓ $FILE"

        # フック定義を表示
        echo "    ---"
        grep -E "export (function |const )use" "$FILE" | head -5 | sed 's/^/    /' || true
        echo ""
      fi
    done
  fi
done

if [ "$FOUND" = false ]; then
  echo "❌ '$KEYWORD'に一致するフックが見つかりませんでした"
  echo ""
  echo "💡 ヒント:"
  echo "  - キーワードを変えてみてください"
  echo "  - 部分一致で検索されます（例: 'use' → 'useUser', 'useAuth'）"
else
  echo "================================"
  echo "✨ 検索完了"
fi
