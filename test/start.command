#!/bin/zsh
set -e

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=4173
HOST="127.0.0.1"
URL="http://${HOST}:${PORT}/index.html"

cd "$APP_DIR"

if ! command -v python3 >/dev/null 2>&1; then
  osascript -e 'display dialog "未找到 python3，无法启动本地预览服务。" buttons {"好"} default button 1 with icon stop'
  exit 1
fi

if lsof -nP -iTCP:${PORT} -sTCP:LISTEN >/dev/null 2>&1; then
  echo "本地服务已在 ${PORT} 端口运行，直接打开页面：${URL}"
else
  echo "启动本地服务：${URL}"
  python3 -m http.server ${PORT} --bind ${HOST} >/tmp/spec-promo-materials-4173.log 2>&1 &
  SERVER_PID=$!
  echo "服务 PID: ${SERVER_PID}"

  for i in {1..30}; do
    if lsof -nP -iTCP:${PORT} -sTCP:LISTEN >/dev/null 2>&1; then
      break
    fi
    sleep 0.1
  done
fi

open "$URL"
echo "已打开完整体验页面。"
echo "日志：/tmp/spec-promo-materials-4173.log"
echo "可以关闭这个窗口；服务会在后台继续运行。"
