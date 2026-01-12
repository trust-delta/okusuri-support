#!/bin/bash
# Context Display Hook - UserPromptSubmit時にコンテキスト情報を表示
# stdoutがそのままコンテキストに追加される

THRESHOLD_STEP=5  # 5%刻み

# stdinからJSON入力を読み取り
INPUT=$(cat)

# デバッグログ
echo "[$(date '+%H:%M:%S')] context-display.sh called (UserPromptSubmit)" >> /tmp/claude-hook-debug.log
echo "$INPUT" > /tmp/claude-hook-input-debug.json

# Node.jsでJSON処理してプレーンテキストで出力
node -e "
const fs = require('fs');

try {
  // stdinから渡されたhook入力を解析
  const hookInput = $INPUT;
  const sessionId = hookInput.session_id || 'default';

  // セッションごとのファイルパス
  const contextFile = '/tmp/claude-context-' + sessionId + '.json';
  const thresholdFile = '/tmp/claude-context-threshold-' + sessionId + '.txt';

  // コンテキストファイルが存在しない場合は終了
  if (!fs.existsSync(contextFile)) {
    process.exit(0);
  }

  const data = JSON.parse(fs.readFileSync(contextFile, 'utf8'));
  const ctx = data.context_window;

  if (!ctx) {
    process.exit(0);
  }

  // 計算
  const windowSize = ctx.context_window_size || 200000;
  const usage = ctx.current_usage || {};
  const inputTokens = usage.input_tokens || 0;
  const cacheCreation = usage.cache_creation_input_tokens || 0;
  const cacheRead = usage.cache_read_input_tokens || 0;

  const total = inputTokens + cacheCreation + cacheRead;
  const percent = Math.round(total * 100 / windowSize);

  // バー表示
  const barLength = 20;
  const filled = Math.round(percent / 100 * barLength);
  const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);

  const message = \`[Context] \${bar} \${percent}% (\${total.toLocaleString()} / \${windowSize.toLocaleString()} tokens)\`;
  console.log(message);    // Claudeへのコンテキスト

  // 閾値チェック
  const thresholdStep = $THRESHOLD_STEP;
  const currentThreshold = Math.floor(percent / thresholdStep) * thresholdStep;

  let lastThreshold = -1;
  try {
    lastThreshold = parseInt(fs.readFileSync(thresholdFile, 'utf8').trim());
    if (isNaN(lastThreshold)) lastThreshold = -1;
  } catch (e) {
    // ファイルがなければ-1（未初期化）
  }

  // 未初期化の場合、現在の閾値で初期化（アラートなし）
  if (lastThreshold === -1) {
    fs.writeFileSync(thresholdFile, String(currentThreshold));
    lastThreshold = currentThreshold;
  }

  // 新しい閾値を超えた場合のみアラート
  if (currentThreshold > lastThreshold) {
    console.log(\`[Context Alert] コンテキスト使用率が\${currentThreshold}%を超えました。ユーザーに知らせてください。\`);
    fs.writeFileSync(thresholdFile, String(currentThreshold));
  }
} catch (e) {
  // エラーは静かに無視
}
"

exit 0
