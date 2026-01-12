#!/bin/bash
# Claude Code Context Monitor - Statusline Script
# コンテキスト情報をセッションごとのファイルに保存し、スキルから読み取り可能にする

# 一時ファイル置き場（スクリプトからの相対パス）
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TMP_DIR="$SCRIPT_DIR/../tmp/hooks"
mkdir -p "$TMP_DIR"

# stdinからJSONを読み取り
input=$(cat)

# デバッグ: 入力データをログに保存
echo "$input" > "$TMP_DIR/statusline-debug.json"

# Node.jsでJSONを処理
node -e "
const input = $input;
const fs = require('fs');

// セッションIDを取得（なければ 'default'）
const sessionId = input.session_id || 'default';
const tmpDir = '$TMP_DIR';
const outputFile = tmpDir + '/context-' + sessionId + '.json';

const timestamp = new Date().toISOString();
const output = {
  timestamp,
  session_id: sessionId,
  context_window: input.context_window || null
};

fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));

// ステータスライン表示
if (input.context_window) {
  const ctx = input.context_window;
  const size = ctx.context_window_size || 200000;
  const usage = ctx.current_usage || {};

  const inputTokens = usage.input_tokens || 0;
  const cacheCreation = usage.cache_creation_input_tokens || 0;
  const cacheRead = usage.cache_read_input_tokens || 0;

  const total = inputTokens + cacheCreation + cacheRead;
  const percent = Math.round(total * 100 / size);

  console.log('CTX:' + percent + '%');
}
" 2>/dev/null
