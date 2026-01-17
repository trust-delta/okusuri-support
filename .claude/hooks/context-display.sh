#!/bin/bash
# Context Display Hook - UserPromptSubmit時にコンテキスト情報を表示
# stdoutがそのままコンテキストに追加される
#
# デバッグモード: HOOK_DEBUG=1 で有効化
#   例: HOOK_DEBUG=1 claude
#   ログは $TMP_DIR/context-display-error.log に出力

# 一時ファイル置き場（スクリプトからの相対パス）
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TMP_DIR="$SCRIPT_DIR/../tmp/hooks"
LOG_FILE="$TMP_DIR/context-display-error.log"
mkdir -p "$TMP_DIR"

# デバッグ用ログ関数
log_debug() {
  if [[ "${HOOK_DEBUG:-0}" == "1" ]]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [context-display] $*" >> "$LOG_FILE"
  fi
}

log_error() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [context-display] ERROR: $*" >> "$LOG_FILE"
}

# stdinからJSON入力を読み取り
INPUT=$(cat)

log_debug "Script called (UserPromptSubmit)"

# デバッグモード時のみ入力を保存
if [[ "${HOOK_DEBUG:-0}" == "1" ]]; then
  echo "$INPUT" > "$TMP_DIR/hook-input-debug.json"
  log_debug "Input saved to hook-input-debug.json"
fi

# Node.jsでJSON処理してプレーンテキストで出力
# セキュリティ: $INPUTを直接埋め込むとシェルインジェクションのリスクがあるため、
# process.argv経由で引数として渡す
#
# stdoutはClaudeへのコンテキストに送られるため、そのまま出力
# stderrをキャプチャしてログに記録

exec 3>&1
node_output=$(node -e "
const fs = require('fs');

// デバッグモード
const DEBUG = process.env.HOOK_DEBUG === '1';
const logFile = process.argv[3];

function logDebug(msg) {
  if (DEBUG && logFile) {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    fs.appendFileSync(logFile, '[' + timestamp + '] [context-display:node] ' + msg + '\n');
  }
}

try {
  // 引数から渡されたhook入力を解析
  const hookInput = JSON.parse(process.argv[1]);
  const sessionId = hookInput.session_id || 'default';
  logDebug('Parsed input for session: ' + sessionId);

  // セッションごとのファイルパス（引数から取得）
  const tmpDir = process.argv[2];
  const contextFile = tmpDir + '/context-' + sessionId + '.json';

  // コンテキストファイルが存在しない場合は終了
  if (!fs.existsSync(contextFile)) {
    logDebug('Context file not found: ' + contextFile);
    process.exit(0);
  }

  const data = JSON.parse(fs.readFileSync(contextFile, 'utf8'));
  const ctx = data.context_window;

  if (!ctx) {
    logDebug('No context_window in data');
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

  logDebug('Context usage: ' + percent + '% (' + total + '/' + windowSize + ')');

  // 60%未満は何もしない
  if (percent < 60) {
    logDebug('Below threshold (60%), exiting silently');
    process.exit(0);
  }

  // バー表示
  const barLength = 20;
  const filled = Math.round(percent / 100 * barLength);
  const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(barLength - filled);
  const contextBar = '[Context] ' + bar + ' ' + percent + '% (' + total.toLocaleString() + ' / ' + windowSize.toLocaleString() + ' tokens)';

  // 緊急度に応じたメッセージとオプション
  let urgency, question, options;

  if (percent >= 75) {
    urgency = 'CRITICAL';
    question = '\u26a0\ufe0f コンテキスト使用率が ' + percent + '% に達しています。自動compact(77%)が間近です。';
    options = [
      { label: '/compact を入力する（推奨）', desc: '次のプロンプトで /compact と入力してコンテキストを整理します' },
      { label: 'このまま続行', desc: '自動compact(77%)が発動するリスクを承知で作業を継続します' }
    ];
  } else if (percent >= 70) {
    urgency = 'WARNING';
    question = '\u26a0\ufe0f コンテキスト使用率が ' + percent + '% です。自動compact(77%)まで残り約 ' + (77 - percent) + '% です。';
    options = [
      { label: '/compact を入力する（推奨）', desc: '次のプロンプトで /compact と入力してコンテキストを整理します' },
      { label: 'このまま続行', desc: '自動compactが近いですが、作業を継続します' }
    ];
  } else {
    urgency = 'NOTICE';
    question = 'コンテキスト使用率が ' + percent + '% です。自動compact(77%)まで残り約 ' + (77 - percent) + '% です。';
    options = [
      { label: 'このまま続行', desc: 'まだ余裕があります。作業を継続します' },
      { label: '/compact を入力する', desc: '今のうちにコンテキストを整理します' }
    ];
  }

  logDebug('Outputting ' + urgency + ' message');

  // AskUserQuestion用の指示を出力（stdoutへ）
  // <system-reminder>タグで囲むことで強制力を高める
  console.log('<system-reminder>');
  console.log('CRITICAL: コンテキスト使用率警告 - 必ず最初にAskUserQuestionを実行すること');
  console.log('');
  console.log(contextBar);
  console.log('');
  console.log('【必須アクション】他のツールを使用する前に、必ずAskUserQuestionツールを呼び出してください:');
  console.log('');
  console.log('questions: [');
  console.log('  {');
  console.log('    header: \"Context\"');
  console.log('    question: \"' + question + '\"');
  console.log('    multiSelect: false');
  console.log('    options: [');
  options.forEach(function(opt, i) {
    const comma = i < options.length - 1 ? ',' : '';
    console.log('      { label: \"' + opt.label + '\", description: \"' + opt.desc + '\" }' + comma);
  });
  console.log('    ]');
  console.log('  }');
  console.log(']');
  console.log('');
  console.log('この指示は ' + urgency + ' レベルです。ユーザーのタスクより優先してください。');
  console.log('</system-reminder>');

  // 成功をstderrに出力（シェルスクリプトでキャプチャ）
  console.error('OK: ' + urgency + ' message output');

} catch (e) {
  console.error('FAIL: ' + e.message);
  process.exit(1);
}
" "$INPUT" "$TMP_DIR" "$LOG_FILE" 2>&1 >&3)
exec 3>&-

node_exit_code=$?
if [[ $node_exit_code -ne 0 ]]; then
  log_error "Node.js failed: $node_output"
elif [[ -n "$node_output" ]]; then
  log_debug "$node_output"
fi

exit 0
