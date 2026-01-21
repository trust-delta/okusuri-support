#!/bin/bash
# statusline.sh - ccstatusline のラッパー
# コンテキスト情報をファイルに保存しつつ、表示は ccstatusline に委譲
#
# デバッグモード: HOOK_DEBUG=1 で有効化
#   例: HOOK_DEBUG=1 claude
#   ログは $TMP_DIR/statusline-error.log に出力

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TMP_DIR="$SCRIPT_DIR/../tmp/hooks"
mkdir -p "$TMP_DIR"

# デバッグ用ログ関数
log_debug() {
  if [[ "${HOOK_DEBUG:-0}" == "1" ]]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [statusline] $*" >> "$TMP_DIR/statusline-error.log"
  fi
}

log_error() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [statusline] ERROR: $*" >> "$TMP_DIR/statusline-error.log"
}

# stdin を変数に保存（再利用のため）
input=$(cat)

log_debug "Script called"

# ファイル保存（hook用）
# セキュリティ: $inputを直接埋め込むとシェルインジェクションのリスクがあるため、
# process.argv経由で引数として渡す
node_output=$(node -e "
const fs = require('fs');
try {
  const input = JSON.parse(process.argv[1]);
  // セキュリティ: session_idをサニタイズ（パストラバーサル対策）
  // 英数字、ハイフン、アンダースコアのみ許可
  const rawSessionId = input.session_id || 'default';
  const sessionId = rawSessionId.replace(/[^a-zA-Z0-9_-]/g, '');
  const tmpDir = process.argv[2];
  const output = {
    timestamp: new Date().toISOString(),
    session_id: sessionId,
    context_window: input.context_window || null
  };
  fs.writeFileSync(tmpDir + '/context-' + sessionId + '.json', JSON.stringify(output, null, 2));
  console.error('OK: context saved for session ' + sessionId);
} catch (e) {
  console.error('FAIL: ' + e.message);
  process.exit(1);
}
" "$input" "$TMP_DIR" 2>&1)

node_exit_code=$?
if [[ $node_exit_code -ne 0 ]]; then
  log_error "Node.js failed: $node_output"
else
  log_debug "$node_output"
fi

# ccstatusline に渡す（一部フォントで表示できない文字を置換）
# U+16830 (𖠰) → U+F0405 (󰐅 nf-md-source_branch)
filter_icons() {
  sed 's/𖠰/󰐅/g'
}

if [[ "${HOOK_DEBUG:-0}" == "1" ]]; then
  echo "$input" | npx ccstatusline@latest 2>> "$TMP_DIR/statusline-error.log" | filter_icons
else
  echo "$input" | npx ccstatusline@latest 2>/dev/null | filter_icons
fi
