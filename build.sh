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
echo ">> 构建 WordAtlas 前端产物..."
npm run build
[[ -d dist ]] && copy_to_apps_dir "$ROOT" dist || true
echo ">> 完成"
echo ">> 发布目录: $(noah_apps_dir "$ROOT")"
