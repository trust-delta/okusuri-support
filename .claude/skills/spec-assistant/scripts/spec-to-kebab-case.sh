#!/usr/bin/env bash
# kebab-case変換スクリプト
# 使い方: ./scripts/spec-to-kebab-case.sh "機能名"
# 例: ./scripts/spec-to-kebab-case.sh "通知機能"
# 例: ./scripts/spec-to-kebab-case.sh "リマインダー設定"

set -euo pipefail

# 引数チェック
if [ $# -eq 0 ]; then
  echo "エラー: 変換する文字列を指定してください。" >&2
  echo "使い方: $0 \"機能名\"" >&2
  exit 1
fi

INPUT="$1"

# 日本語→英語の簡易変換マップ
# プロジェクト固有の頻出単語を追加
declare -A TRANSLATION_MAP=(
  # 一般的な単語
  ["機能"]="feature"
  ["設定"]="settings"
  ["管理"]="management"
  ["一覧"]="list"
  ["詳細"]="detail"
  ["登録"]="registration"
  ["編集"]="edit"
  ["削除"]="delete"
  ["作成"]="create"
  ["更新"]="update"
  ["検索"]="search"
  ["ダッシュボード"]="dashboard"
  ["統計"]="statistics"

  # プロジェクト固有の単語
  ["服薬"]="medication"
  ["薬"]="medicine"
  ["薬剤"]="medication"
  ["通知"]="notification"
  ["リマインダー"]="reminder"
  ["グループ"]="group"
  ["認証"]="auth"
  ["ユーザー"]="user"
  ["患者"]="patient"
  ["サポーター"]="supporter"
  ["履歴"]="history"
  ["オンボーディング"]="onboarding"
  ["プロフィール"]="profile"
  ["アカウント"]="account"
  ["カレンダー"]="calendar"
  ["スケジュール"]="schedule"

  # API関連
  ["API"]="api"
  ["クエリ"]="query"
  ["ミューテーション"]="mutation"
  ["アクション"]="action"
)

# 変換処理
RESULT="$INPUT"

# 1. 翻訳マップによる置換（単語の後にスペースを追加）
for JP in "${!TRANSLATION_MAP[@]}"; do
  EN="${TRANSLATION_MAP[$JP]}"
  # 置換時に後ろにスペースを追加（ただし末尾の場合は追加しない）
  RESULT="${RESULT//$JP/$EN }"
done

# 2. 英数字以外をスペースに変換（日本語が残っている場合は警告を出すが処理は続行）
RESULT=$(echo "$RESULT" | sed 's/[^a-zA-Z0-9]/ /g')

# 3. 連続するスペースを1つに
RESULT=$(echo "$RESULT" | tr -s ' ')

# 4. 前後の空白を削除
RESULT=$(echo "$RESULT" | sed 's/^ *//;s/ *$//')

# 5. スペースをハイフンに変換
RESULT=$(echo "$RESULT" | tr ' ' '-')

# 6. すべて小文字に
RESULT=$(echo "$RESULT" | tr '[:upper:]' '[:lower:]')

# 7. 連続するハイフンを1つに
RESULT=$(echo "$RESULT" | tr -s '-')

# 8. 前後のハイフンを削除
RESULT=$(echo "$RESULT" | sed 's/^-*//;s/-*$//')

# 結果を出力
echo "$RESULT"

# 終了ステータス
exit 0
