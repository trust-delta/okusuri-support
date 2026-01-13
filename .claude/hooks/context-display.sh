#!/bin/bash
# Context Display Hook - UserPromptSubmit時にコンテキスト情報を表示
# stdoutがそのままコンテキストに追加される

# 一時ファイル置き場（スクリプトからの相対パス）
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TMP_DIR="$SCRIPT_DIR/../tmp/hooks"
mkdir -p "$TMP_DIR"

THRESHOLD_STEP=5  # 5%刻み

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
  const thresholdFile = tmpDir + '/threshold-' + sessionId + '.txt';

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
    fs.writeFileSync(thresholdFile, String(currentThreshold));

    // 閾値に応じたメッセージを生成
    if (currentThreshold >= 70) {
      // 緊急: 自動compact間近
      console.log(\`[Context URGENT] コンテキスト使用率が\${currentThreshold}%に達しました。自動compact(約77%)が間近です。\`);
      console.log(\`【必須アクション】ユーザーの指示を実行する前に、AskUserQuestionツールで以下を確認してください：\`);
      console.log(\`「コンテキスト使用率が\${percent}%に達し、自動compact(77%)が間近です。自動compactは品質低下を招く可能性があります。\`);
      console.log(\`次のいずれかを選択してください：\`);
      console.log(\`1. 今すぐ /compact を実行する\`);
      console.log(\`2. 現在のタスクを完了してセッションを終了する\`);
      console.log(\`3. このまま続行する（自動compactのリスクあり）」\`);
    } else if (currentThreshold >= 60) {
      // 強い警告
      console.log(\`[Context WARNING] コンテキスト使用率が\${currentThreshold}%に達しました。自動compact(約77%)まで残り約\${77 - percent}%です。\`);
      console.log(\`【推奨アクション】ユーザーの指示を実行する前に、AskUserQuestionツールで以下を確認してください：\`);
      console.log(\`「コンテキスト使用率が\${percent}%です。作業中に自動compact(77%)が発動する可能性が高いです。\`);
      console.log(\`今のうちに /compact するか、セッションを区切ることを推奨します。どうしますか？」\`);
    } else if (currentThreshold >= 50) {
      // 注意喚起 + 確認
      console.log(\`[Context NOTICE] コンテキスト使用率が\${currentThreshold}%に達しました。\`);
      console.log(\`【確認推奨】大きなタスクを開始する前に、ユーザーにコンテキスト状況を伝え、必要に応じて /compact やセッション区切りを提案してください。\`);
    } else {
      // 情報のみ
      console.log(\`[Context Info] コンテキスト使用率が\${currentThreshold}%を超えました。\`);
    }
  }
} catch (e) {
  // エラーは静かに無視
}
"

exit 0
