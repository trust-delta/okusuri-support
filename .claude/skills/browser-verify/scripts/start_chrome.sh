#!/bin/bash
# Chrome起動（リモートデバッグモード）- WSL + Windows Chrome対応
#
# 環境変数:
#   DEBUG_PORT  - デバッグポート (default: 9222)
#   HEADLESS    - true でヘッドレスモード (default: false = ウィンドウ表示)
#   CHROME_BIN  - Chromeの実行パス (自動検出)
#
# 使用例:
#   bash start_chrome.sh                    # ウィンドウ表示モード
#   HEADLESS=true bash start_chrome.sh      # ヘッドレスモード

DEBUG_PORT="${DEBUG_PORT:-9222}"
HEADLESS="${HEADLESS:-false}"
MAX_WAIT=20
CHROME_HOST="127.0.0.1"

# WSLg環境でのDISPLAY設定
if [ -z "$DISPLAY" ]; then
    export DISPLAY=:0
fi

# 既に起動中か確認
if curl -s --max-time 2 "http://${CHROME_HOST}:${DEBUG_PORT}/json/version" > /dev/null 2>&1; then
    VERSION=$(curl -s --max-time 2 "http://${CHROME_HOST}:${DEBUG_PORT}/json/version" | grep -o '"Browser":"[^"]*"' | head -1)
    echo "CHROME_READY: Already running on port ${DEBUG_PORT} - ${VERSION}"
    exit 0
fi

# ヘッドレスオプションの設定
HEADLESS_OPTS=""
if [ "$HEADLESS" = "true" ]; then
    HEADLESS_OPTS="--headless=new"
    echo "Mode: Headless"
else
    echo "Mode: Visible (with window)"
fi

echo "Starting Chrome on port ${DEBUG_PORT}..."

# Chrome実行パスの検出
CHROME_BIN="${CHROME_BIN:-}"
if [ -z "$CHROME_BIN" ]; then
    for cmd in google-chrome google-chrome-stable chromium-browser chromium; do
        if command -v "$cmd" > /dev/null 2>&1; then
            CHROME_BIN="$cmd"
            break
        fi
    done
fi

if [ -z "$CHROME_BIN" ]; then
    echo "CHROME_FAILED: Chrome not found"
    exit 1
fi

# ユーザーデータディレクトリ（固定パスで再利用可能に）
USER_DATA_DIR="${USER_DATA_DIR:-/tmp/chrome-mcp-profile}"
mkdir -p "$USER_DATA_DIR"

# Chrome起動
nohup "$CHROME_BIN" \
    --remote-debugging-port="$DEBUG_PORT" \
    --user-data-dir="$USER_DATA_DIR" \
    --no-first-run \
    --no-default-browser-check \
    --disable-background-timer-throttling \
    --disable-backgrounding-occluded-windows \
    $HEADLESS_OPTS \
    > /dev/null 2>&1 &

CHROME_PID=$!
echo "Chrome PID: $CHROME_PID"

# 接続可能になるまで待機
for i in $(seq 1 $MAX_WAIT); do
    if curl -s --max-time 2 "http://${CHROME_HOST}:${DEBUG_PORT}/json/version" > /dev/null 2>&1; then
        VERSION=$(curl -s --max-time 2 "http://${CHROME_HOST}:${DEBUG_PORT}/json/version" | grep -o '"Browser":"[^"]*"' | head -1)
        echo "CHROME_READY: Started on port ${DEBUG_PORT} (PID: ${CHROME_PID}) - ${VERSION}"
        exit 0
    fi
    sleep 1
done

echo "CHROME_FAILED: Timeout after ${MAX_WAIT}s"
exit 1
