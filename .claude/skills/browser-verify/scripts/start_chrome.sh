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
MAX_WAIT=15

# WSL環境かどうか判定
is_wsl() {
    grep -qiE "(microsoft|wsl)" /proc/version 2>/dev/null
}

# WSL2からWindowsホストのIPを取得
get_windows_host_ip() {
    # /etc/resolv.confからWindowsホストのIPを取得
    grep -m1 nameserver /etc/resolv.conf | awk '{print $2}'
}

# 接続先のホストを決定
# ミラーネットワークモードが有効な場合はlocalhostで接続可能
CHROME_HOST="127.0.0.1"

# 既に起動中か確認
if curl -s "http://${CHROME_HOST}:${DEBUG_PORT}/json/version" > /dev/null 2>&1; then
    VERSION=$(curl -s "http://${CHROME_HOST}:${DEBUG_PORT}/json/version" | grep -o '"Browser":"[^"]*"' | head -1)
    echo "CHROME_READY: Already running on port ${DEBUG_PORT} - ${VERSION}"
    echo "CHROME_HOST: ${CHROME_HOST}"
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

# 起動
echo "Starting Chrome on port ${DEBUG_PORT}..."
echo "Chrome host: ${CHROME_HOST}"

# Linux Chrome を使用（WSL環境でもWSLgでウィンドウ表示可能）
CHROME_BIN="${CHROME_BIN:-google-chrome}"
USER_DATA_DIR="${USER_DATA_DIR:-/tmp/chrome-mcp-profile-$(date +%s)}"

"$CHROME_BIN" \
    --remote-debugging-port="$DEBUG_PORT" \
    --user-data-dir="$USER_DATA_DIR" \
    --no-first-run \
    --no-default-browser-check \
    $HEADLESS_OPTS \
    > /dev/null 2>&1 &

CHROME_PID=$!

# 接続可能になるまでループで待機
for i in $(seq 1 $MAX_WAIT); do
    if curl -s "http://${CHROME_HOST}:${DEBUG_PORT}/json/version" > /dev/null 2>&1; then
        VERSION=$(curl -s "http://${CHROME_HOST}:${DEBUG_PORT}/json/version" | grep -o '"Browser":"[^"]*"' | head -1)
        echo "CHROME_READY: Started on port ${DEBUG_PORT} (PID: ${CHROME_PID}) - ${VERSION}"
        echo "CHROME_HOST: ${CHROME_HOST}"
        exit 0
    fi
    sleep 1
done

echo "CHROME_FAILED: Timeout after ${MAX_WAIT}s"
echo "Tried connecting to: http://${CHROME_HOST}:${DEBUG_PORT}/json/version"
exit 1
