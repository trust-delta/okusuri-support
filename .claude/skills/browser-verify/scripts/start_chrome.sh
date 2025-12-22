#!/bin/bash
# Chrome起動（リモートデバッグモード）

CHROME_BIN="${CHROME_BIN:-google-chrome}"
DEBUG_PORT="${DEBUG_PORT:-9222}"
USER_DATA_DIR="${USER_DATA_DIR:-/tmp/chrome-mcp-profile}"
MAX_WAIT=10

# 既に起動中か確認
if curl -s "http://127.0.0.1:${DEBUG_PORT}/json/version" > /dev/null 2>&1; then
    VERSION=$(curl -s "http://127.0.0.1:${DEBUG_PORT}/json/version" | grep -o '"Browser":"[^"]*"' | head -1)
    echo "CHROME_READY: Already running on port ${DEBUG_PORT} - ${VERSION}"
    exit 0
fi

# 起動
echo "Starting Chrome on port ${DEBUG_PORT}..."
"$CHROME_BIN" \
    --remote-debugging-port="$DEBUG_PORT" \
    --user-data-dir="$USER_DATA_DIR" \
    --no-first-run \
    --no-default-browser-check \
    > /dev/null 2>&1 &

CHROME_PID=$!

# 接続可能になるまでループで待機
for i in $(seq 1 $MAX_WAIT); do
    if curl -s "http://127.0.0.1:${DEBUG_PORT}/json/version" > /dev/null 2>&1; then
        VERSION=$(curl -s "http://127.0.0.1:${DEBUG_PORT}/json/version" | grep -o '"Browser":"[^"]*"' | head -1)
        echo "CHROME_READY: Started on port ${DEBUG_PORT} (PID: ${CHROME_PID}) - ${VERSION}"
        exit 0
    fi
    sleep 1
done

echo "CHROME_FAILED: Timeout after ${MAX_WAIT}s"
exit 1
