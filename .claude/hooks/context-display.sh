#!/bin/bash
# Context Display Hook - UserPromptSubmit時にコンテキスト情報を表示
# stdoutがそのままコンテキストに追加される

# 一時ファイル置き場（スクリプトからの相対パス）
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TMP_DIR="$SCRIPT_DIR/../tmp/hooks"
mkdir -p "$TMP_DIR"

# stdinからJSON入力を読み取り
INPUT=$(cat)

# デバッグログ
echo "[$(date '+%H:%M:%S')] context-display.sh called (UserPromptSubmit)" >> "$TMP_DIR/hook-debug.log"
echo "$INPUT" > "$TMP_DIR/hook-input-debug.json"

# Node.jsでJSON処理してプレーンテキストで出力
node -e "
const fs = require('fs');

try {
  // stdinから渡されたhook入力を解析
  const hookInput = $INPUT;
  const sessionId = hookInput.session_id || 'default';

  // セッションごとのファイルパス
  const tmpDir = '$TMP_DIR';
  const contextFile = tmpDir + '/context-' + sessionId + '.json';

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

  // 60%未満は何もしない
  if (percent < 60) {
    process.exit(0);
  }

  // バー表示
  const barLength = 20;
  const filled = Math.round(percent / 100 * barLength);
  const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
  const contextBar = \`[Context] \${bar} \${percent}% (\${total.toLocaleString()} / \${windowSize.toLocaleString()} tokens)\`;

  // 緊急度に応じたメッセージとオプション
  let urgency, question, options;

  if (percent >= 75) {
    urgency = 'CRITICAL';
    question = \`⚠️ コンテキスト使用率が \${percent}% に達しています。自動compact(77%)が間近です。\`;
    options = [
      { label: '/compact を入力する（推奨）', desc: '次のプロンプトで /compact と入力してコンテキストを整理します' },
      { label: 'このまま続行', desc: '自動compact(77%)が発動するリスクを承知で作業を継続します' }
    ];
  } else if (percent >= 70) {
    urgency = 'WARNING';
    question = \`⚠️ コンテキスト使用率が \${percent}% です。自動compact(77%)まで残り約 \${77 - percent}% です。\`;
    options = [
      { label: '/compact を入力する（推奨）', desc: '次のプロンプトで /compact と入力してコンテキストを整理します' },
      { label: 'このまま続行', desc: '自動compactが近いですが、作業を継続します' }
    ];
  } else {
    urgency = 'NOTICE';
    question = \`コンテキスト使用率が \${percent}% です。自動compact(77%)まで残り約 \${77 - percent}% です。\`;
    options = [
      { label: 'このまま続行', desc: 'まだ余裕があります。作業を継続します' },
      { label: '/compact を入力する', desc: '今のうちにコンテキストを整理します' }
    ];
  }

  // AskUserQuestion用の指示を出力
  console.log(\`【Claude への必須指示】ユーザーの指示を実行する前に、以下の内容でAskUserQuestionツールを使用して確認してください:\`);
  console.log(\`\`);
  console.log(\`header: \"Context \${urgency}\"\`);
  console.log(\`question: \"\${question}\"\`);
  console.log(\`options:\`);
  options.forEach(opt => {
    console.log(\`  - label: \"\${opt.label}\", description: \"\${opt.desc}\"\`);
  });
  console.log(\`\`);
  console.log(\`contextBar: \${contextBar}\`);

} catch (e) {
  // エラーは静かに無視
}
"

exit 0
