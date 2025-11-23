#!/usr/bin/env bash
# 仕様書バリデーションスクリプト
# 使い方: ./scripts/spec-validate.sh <仕様書ファイルパス> [タイプ]
# 例: ./scripts/spec-validate.sh .context/specs/features/medication.md feature
# 例: ./scripts/spec-validate.sh .context/specs/api/auth-api.md api

set -euo pipefail

# 引数チェック
if [ $# -eq 0 ]; then
  echo "エラー: 仕様書ファイルパスを指定してください。" >&2
  echo "使い方: $0 <仕様書ファイルパス> [タイプ]" >&2
  exit 1
fi

SPEC_FILE="$1"
TYPE="${2:-auto}"

# ファイル存在チェック
if [ ! -f "$SPEC_FILE" ]; then
  echo "エラー: ファイルが見つかりません: $SPEC_FILE" >&2
  exit 1
fi

# タイプの自動判定
if [ "$TYPE" = "auto" ]; then
  if [[ "$SPEC_FILE" =~ /features/ ]]; then
    TYPE="feature"
  elif [[ "$SPEC_FILE" =~ /api/ ]]; then
    TYPE="api"
  else
    echo "警告: タイプを自動判定できません。'feature' または 'api' を明示的に指定してください。" >&2
    TYPE="unknown"
  fi
fi

# バリデーション結果
ERRORS=0
WARNINGS=0

echo "=== 仕様書バリデーション: $SPEC_FILE ==="
echo "タイプ: $TYPE"
echo ""

# ファイル名チェック
BASENAME=$(basename "$SPEC_FILE")
if ! [[ "$BASENAME" =~ ^[a-z0-9-]+\.md$ ]]; then
  echo "❌ エラー: ファイル名がkebab-case形式ではありません: $BASENAME"
  ((ERRORS++))
else
  echo "✅ ファイル名: kebab-case形式"
fi

# API仕様書の場合のファイル名チェック
if [ "$TYPE" = "api" ] && ! [[ "$BASENAME" =~ -api\.md$ ]]; then
  echo "⚠️  警告: API仕様書のファイル名は '[feature-name]-api.md' 形式が推奨されます"
  ((WARNINGS++))
fi

# 必須セクションチェック
echo ""
echo "--- 必須セクションチェック ---"

# 共通セクション
check_section() {
  local section_name="$1"
  local section_pattern="$2"

  if grep -qE "$section_pattern" "$SPEC_FILE"; then
    echo "✅ $section_name"
  else
    echo "❌ エラー: $section_name が見つかりません"
    ((ERRORS++))
  fi
}

# タイトル（# で始まる行）
check_section "タイトル" "^#\s+"

# 最終更新日
if grep -qE "最終更新.*20[0-9]{2}年[0-9]{1,2}月[0-9]{1,2}日" "$SPEC_FILE"; then
  echo "✅ 最終更新日 (YYYY年MM月DD日形式)"
else
  echo "❌ エラー: 最終更新日が見つからないか、形式が不正です (YYYY年MM月DD日形式が必要)"
  ((ERRORS++))
fi

# 概要
check_section "概要セクション" "^##\s+概要"

# タイプ別の必須セクション
if [ "$TYPE" = "feature" ]; then
  check_section "ユースケース" "^##\s+ユースケース"
  check_section "機能要件" "^##\s+機能要件"
  check_section "データモデル" "^##\s+データモデル"
  check_section "UI/UX要件" "^##\s+UI/UX要件"

  # TypeScript形式のデータモデルチェック
  if grep -qE "^(interface|type)\s+\w+" "$SPEC_FILE"; then
    echo "✅ データモデル (TypeScript形式)"
  else
    echo "⚠️  警告: TypeScript形式のデータモデル定義が見つかりません"
    ((WARNINGS++))
  fi

elif [ "$TYPE" = "api" ]; then
  # Queries/Mutations/Actionsのいずれか
  if grep -qE "^##\s+(Queries|Mutations|Actions)" "$SPEC_FILE"; then
    echo "✅ API関数定義 (Queries/Mutations/Actions)"
  else
    echo "❌ エラー: API関数定義が見つかりません (Queries/Mutations/Actions)"
    ((ERRORS++))
  fi

  check_section "データモデル" "^##\s+データモデル"

  # コード例チェック
  if grep -qE '```(typescript|ts)' "$SPEC_FILE"; then
    echo "✅ コード例 (TypeScript形式)"
  else
    echo "⚠️  警告: TypeScript形式のコード例が見つかりません"
    ((WARNINGS++))
  fi
fi

# 文字エンコーディングチェック
echo ""
echo "--- ファイル形式チェック ---"
if file "$SPEC_FILE" | grep -q "UTF-8"; then
  echo "✅ 文字エンコーディング: UTF-8"
else
  echo "⚠️  警告: UTF-8ではない可能性があります"
  ((WARNINGS++))
fi

# 改行コードチェック (LF推奨)
if file "$SPEC_FILE" | grep -q "CRLF"; then
  echo "⚠️  警告: 改行コードがCRLFです (LFが推奨)"
  ((WARNINGS++))
else
  echo "✅ 改行コード: LF"
fi

# 結果サマリー
echo ""
echo "=== バリデーション結果 ==="
echo "エラー: $ERRORS"
echo "警告: $WARNINGS"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo "✅ すべてのチェックに合格しました"
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo "⚠️  警告があります ($WARNINGS件)"
  exit 0
else
  echo "❌ エラーがあります ($ERRORS件)"
  exit 1
fi
