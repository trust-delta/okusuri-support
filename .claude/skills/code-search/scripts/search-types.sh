#!/bin/bash
# 型定義を検索

set -e

# 引数チェック
if [ $# -eq 0 ]; then
  echo "使用方法: $0 <type-name> [directory]"
  echo ""
  echo "例:"
  echo "  $0 User                    # 'User'を含む型定義を検索"
  echo "  $0 Notification convex     # convex内の'Notification'型を検索"
  echo ""
  echo "検索対象:"
  echo "  - interface定義"
  echo "  - type定義"
  echo "  - Zod schema"
  exit 1
fi

TYPE_NAME=$1
SEARCH_DIR=${2:-.}

echo "🔍 型定義検索: '$TYPE_NAME'"
echo "================================"
echo ""

# TypeScript/TSXファイルを検索
FILES=$(find "$SEARCH_DIR" -type f \( -name "*.ts" -o -name "*.tsx" \) 2>/dev/null || echo "")

if [ -z "$FILES" ]; then
  echo "❌ TypeScriptファイルが見つかりませんでした"
  exit 1
fi

FOUND=false

echo "$FILES" | while read -r FILE; do
  # interface定義を検索
  INTERFACE_MATCHES=$(grep -n "interface.*$TYPE_NAME" "$FILE" 2>/dev/null || echo "")

  # type定義を検索
  TYPE_MATCHES=$(grep -n "type.*$TYPE_NAME" "$FILE" 2>/dev/null || echo "")

  # Zod schema定義を検索
  ZOD_MATCHES=$(grep -n "z\.object.*$TYPE_NAME\|const.*$TYPE_NAME.*=.*z\." "$FILE" 2>/dev/null || echo "")

  if [ -n "$INTERFACE_MATCHES" ] || [ -n "$TYPE_MATCHES" ] || [ -n "$ZOD_MATCHES" ]; then
    FOUND=true
    echo "📄 $FILE"
    echo "  ---"

    if [ -n "$INTERFACE_MATCHES" ]; then
      echo "  【Interface定義】"
      echo "$INTERFACE_MATCHES" | sed 's/^/  /'
    fi

    if [ -n "$TYPE_MATCHES" ]; then
      echo "  【Type定義】"
      echo "$TYPE_MATCHES" | sed 's/^/  /'
    fi

    if [ -n "$ZOD_MATCHES" ]; then
      echo "  【Zod Schema】"
      echo "$ZOD_MATCHES" | sed 's/^/  /'
    fi

    echo ""
  fi
done

if [ "$FOUND" = false ]; then
  echo "❌ '$TYPE_NAME'に一致する型定義が見つかりませんでした"
  echo ""
  echo "💡 ヒント:"
  echo "  - 型名を確認してください"
  echo "  - 部分一致で検索されます"
else
  echo "================================"
  echo "✨ 検索完了"
fi
