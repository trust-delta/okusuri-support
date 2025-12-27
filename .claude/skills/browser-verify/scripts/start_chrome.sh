#!/bin/bash
# Chrome起動（リモートデバッグモード）- WSL + Windows Chrome対応

DEBUG_PORT="${DEBUG_PORT:-9222}"
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

# 起動
echo "Starting Chrome on port ${DEBUG_PORT}..."
echo "Chrome host: ${CHROME_HOST}"

if is_wsl; then
    # WSL環境: Windows上のChromeを使用
    CHROME_BIN="${CHROME_BIN:-/mnt/c/Program Files/Google/Chrome/Application/chrome.exe}"
    # Windows形式のパスでユーザーデータディレクトリを指定（タイムスタンプ付きで一意に）
    WIN_USER_DATA_DIR="${WIN_USER_DATA_DIR:-C:\\Temp\\chrome-mcp-profile-$(date +%s)}"

    "$CHROME_BIN" \
        --remote-debugging-port="$DEBUG_PORT" \
        --remote-debugging-address=0.0.0.0 \
        --user-data-dir="$WIN_USER_DATA_DIR" \
        --no-first-run \
        --no-default-browser-check \
        > /dev/null 2>&1 &
else
    # Linux環境: ネイティブChromeを使用
    CHROME_BIN="${CHROME_BIN:-google-chrome}"
    USER_DATA_DIR="${USER_DATA_DIR:-/tmp/chrome-mcp-profile}"

    "$CHROME_BIN" \
        --remote-debugging-port="$DEBUG_PORT" \
        --user-data-dir="$USER_DATA_DIR" \
        --no-first-run \
        --no-default-browser-check \
        > /dev/null 2>&1 &
fi

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
