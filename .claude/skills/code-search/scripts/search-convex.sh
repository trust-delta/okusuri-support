#!/bin/bash
# Convex関数を検索

set -e

# 引数チェック
if [ $# -eq 0 ]; then
  echo "使用方法: $0 <type> [function-name]"
  echo ""
  echo "例:"
  echo "  $0 queries                 # すべてのqueries.tsファイルを検索"
  echo "  $0 queries list            # 'list'を含むquery関数を検索"
  echo "  $0 mutations create        # 'create'を含むmutation関数を検索"
  echo "  $0 actions                 # すべてのactions.tsファイルを検索"
  echo ""
  echo "type:"
  echo "  - queries    (データ取得)"
  echo "  - mutations  (データ更新)"
  echo "  - actions    (外部API連携)"
  exit 1
fi

TYPE=$1
FUNCTION_NAME=${2:-""}

if [[ ! "$TYPE" =~ ^(queries|mutations|actions)$ ]]; then
  echo "❌ エラー: typeは queries, mutations, actions のいずれかである必要があります"
  exit 1
fi

echo "🔍 Convex $TYPE 検索"
if [ -n "$FUNCTION_NAME" ]; then
  echo "   関数名: '$FUNCTION_NAME'"
fi
echo "================================"
echo ""

# ファイルを検索
FILES=$(find convex -name "$TYPE.ts" 2>/dev/null || echo "")

if [ -z "$FILES" ]; then
  echo "❌ convex/*/$TYPE.ts が見つかりませんでした"
  exit 1
fi

FOUND=false

echo "$FILES" | while read -r FILE; do
  if [ -f "$FILE" ]; then
    echo "📄 $FILE"

    if [ -n "$FUNCTION_NAME" ]; then
      # 特定の関数名を検索
      MATCHES=$(grep -E "export (const|function) .*$FUNCTION_NAME" "$FILE" || echo "")
      if [ -n "$MATCHES" ]; then
        FOUND=true
        echo "  ---"
        echo "$MATCHES" | sed 's/^/  /'
        echo ""
      fi
    else
      # すべての関数をリスト
      echo "  ---"
      grep -E "export const [a-zA-Z]+ = (query|mutation|action)" "$FILE" | sed 's/^/  /' || true
      echo ""
      FOUND=true
    fi
  fi
done

if [ "$FOUND" = false ] && [ -n "$FUNCTION_NAME" ]; then
  echo "❌ '$FUNCTION_NAME'に一致する関数が見つかりませんでした"
  echo ""
  echo "💡 ヒント:"
  echo "  - 関数名を確認してください"
  echo "  - 部分一致で検索されます"
else
  echo "================================"
  echo "✨ 検索完了"
fi
