#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
_01_APP_ROOT="$ROOT"
while [[ ! -d "$_01_APP_ROOT/_scripts" && "$_01_APP_ROOT" != "/" ]]; do
  _01_APP_ROOT="$(dirname "$_01_APP_ROOT")"
done
source "$_01_APP_ROOT/_scripts/lib/common.sh"

parse_clean_args "$@"
for arg in "$@"; do case "$arg" in -h|--help) clean_help; exit 0 ;; esac; done
echo "将清理:"
report_dir_size "$ROOT/dist"
report_dir_size "$ROOT/node_modules"
[[ -d dist || -d node_modules ]] || { echo "无需清理"; exit 0; }
confirm_delete "$CLEAN_YES" || exit 0
rm_dir_if_exists dist "dist/"
rm_dir_if_exists node_modules "node_modules/"
echo ">> 清理完成"
