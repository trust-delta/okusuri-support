#!/bin/bash
# statusline.sh - ccstatusline のラッパー
# コンテキスト情報をファイルに保存しつつ、表示は ccstatusline に委譲

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TMP_DIR="$SCRIPT_DIR/../tmp/hooks"
mkdir -p "$TMP_DIR"

# stdin を変数に保存（再利用のため）
input=$(cat)

# ファイル保存（hook用）
node -e "
const fs = require('fs');
try {
  const input = $input;
  const sessionId = input.session_id || 'default';
  const output = {
    timestamp: new Date().toISOString(),
    session_id: sessionId,
    context_window: input.context_window || null
  };
  fs.writeFileSync('$TMP_DIR/context-' + sessionId + '.json', JSON.stringify(output, null, 2));
} catch (e) {
  // エラーは静かに無視
}
" 2>/dev/null

# ccstatusline に渡す
echo "$input" | npx ccstatusline@latest 2>/dev/null
