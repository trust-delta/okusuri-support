#!/usr/bin/env bash
# 関連実装ファイル検索スクリプト
# 使い方: ./scripts/spec-find-impl.sh <機能名> [最大件数]
# 例: ./scripts/spec-find-impl.sh medication 5
# 例: ./scripts/spec-find-impl.sh group 3

set -euo pipefail

# 引数チェック
if [ $# -eq 0 ]; then
  echo "エラー: 機能名を指定してください。" >&2
  echo "使い方: $0 <機能名> [最大件数]" >&2
  exit 1
fi

FEATURE_NAME="$1"
MAX_COUNT="${2:-5}"

echo "=== 関連実装ファイル検索 ==="
echo "機能名: $FEATURE_NAME"
echo "最大件数: $MAX_COUNT"
echo ""

# 結果を格納する一時ファイル
TEMP_FILE=$(mktemp)
trap "rm -f $TEMP_FILE" EXIT

# 検索対象ディレクトリ
SEARCH_DIRS=(
  "src/features/$FEATURE_NAME"
  "convex/$FEATURE_NAME"
  "src/components/$FEATURE_NAME"
)

# 追加の検索パターン（kebab-caseやcamelCase変換）
FEATURE_KEBAB=$(echo "$FEATURE_NAME" | sed 's/_/-/g' | tr '[:upper:]' '[:lower:]')
FEATURE_CAMEL=$(echo "$FEATURE_NAME" | perl -pe 's/(^|_)(.)/\U$2/g')
FEATURE_PASCAL=$(echo "$FEATURE_CAMEL" | perl -pe 's/^(.)/\U$1/')

echo "検索バリエーション:"
echo "  - オリジナル: $FEATURE_NAME"
echo "  - kebab-case: $FEATURE_KEBAB"
echo "  - camelCase: $FEATURE_CAMEL"
echo "  - PascalCase: $FEATURE_PASCAL"
echo ""

# 各ディレクトリで検索
for DIR in "${SEARCH_DIRS[@]}"; do
  if [ -d "$DIR" ]; then
    echo "📁 検索中: $DIR"

    # TypeScript/TSXファイルを検索
    find "$DIR" -type f \( -name "*.ts" -o -name "*.tsx" \) \
      ! -path "*/node_modules/*" \
      ! -path "*/.next/*" \
      ! -path "*/dist/*" \
      >> "$TEMP_FILE" || true
  fi
done

# 機能名に関連するファイルをさらに検索（ディレクトリ外）
echo ""
echo "📁 プロジェクト全体で検索中..."

# src/ 配下で機能名を含むファイルを検索
find src -type f \( -name "*.ts" -o -name "*.tsx" \) \
  \( -name "*$FEATURE_NAME*" -o -name "*$FEATURE_KEBAB*" -o -name "*$FEATURE_CAMEL*" \) \
  ! -path "*/node_modules/*" \
  ! -path "*/.next/*" \
  >> "$TEMP_FILE" || true

# convex/ 配下で機能名を含むファイルを検索
find convex -type f \( -name "*.ts" -o -name "*.tsx" \) \
  \( -name "*$FEATURE_NAME*" -o -name "*$FEATURE_KEBAB*" -o -name "*$FEATURE_CAMEL*" \) \
  ! -path "*/node_modules/*" \
  ! -path "*/_generated/*" \
  >> "$TEMP_FILE" || true

# 重複を削除してソート
if [ -s "$TEMP_FILE" ]; then
  echo ""
  echo "=== 検索結果（最大 $MAX_COUNT 件） ==="

  sort -u "$TEMP_FILE" | head -n "$MAX_COUNT" | while read -r FILE; do
    # ファイルサイズと行数を取得
    SIZE=$(wc -c < "$FILE" | awk '{print $1}')
    LINES=$(wc -l < "$FILE" | awk '{print $1}')

    # サイズを人間に読みやすい形式に変換
    if [ "$SIZE" -lt 1024 ]; then
      SIZE_STR="${SIZE}B"
    elif [ "$SIZE" -lt 1048576 ]; then
      SIZE_STR="$((SIZE / 1024))KB"
    else
      SIZE_STR="$((SIZE / 1048576))MB"
    fi

    echo "📄 $FILE"
    echo "   サイズ: $SIZE_STR, 行数: $LINES"

    # ファイルの先頭コメントまたはexport文を表示（概要把握のため）
    SUMMARY=$(head -n 20 "$FILE" | grep -E "^(//|/\*|\*|export)" | head -n 3 | sed 's/^/   /')
    if [ -n "$SUMMARY" ]; then
      echo "$SUMMARY"
    fi
    echo ""
  done

  # 件数が最大を超えた場合の警告
  TOTAL_COUNT=$(sort -u "$TEMP_FILE" | wc -l)
  if [ "$TOTAL_COUNT" -gt "$MAX_COUNT" ]; then
    echo "⚠️  注意: 検索結果は $TOTAL_COUNT 件ありますが、最初の $MAX_COUNT 件のみ表示しています。"
    echo "   すべて表示するには、最大件数を増やしてください: $0 $FEATURE_NAME $TOTAL_COUNT"
  fi
else
  echo "該当する実装ファイルが見つかりませんでした。"
  echo ""
  echo "確認事項:"
  echo "  - 機能名が正しいか確認してください"
  echo "  - src/features/ または convex/ 配下にディレクトリが存在するか確認してください"
fi

# 終了ステータス
exit 0
