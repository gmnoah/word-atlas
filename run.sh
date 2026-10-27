#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
_01_APP_ROOT="$ROOT"
while [[ ! -d "$_01_APP_ROOT/_scripts" && "$_01_APP_ROOT" != "/" ]]; do
  _01_APP_ROOT="$(dirname "$_01_APP_ROOT")"
done
source "$_01_APP_ROOT/_scripts/lib/common.sh"
ensure_npm_deps
echo ">> 启动 WordAtlas 开发服务器 (http://localhost:5188) (Ctrl+C 退出)..."
exec npm run dev
