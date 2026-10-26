#!/usr/bin/env bash
set -euo pipefail
export npm_config_engine_strict=true

if [[ $# -ne 1 ]]; then
  echo "usage: bash smoke.sh /absolute/path/to/express-light-rail-*.tgz" >&2
  exit 2
fi

artifact=$1
if [[ "$artifact" != /* || ! -f "$artifact" ]]; then
  echo "package artifact must be an existing absolute path: $artifact" >&2
  exit 2
fi
if [[ -z "${REDIS_URL:-}" ]]; then
  echo "REDIS_URL must point to a disposable Redis instance" >&2
  exit 2
fi

fixture_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
tmp_dir=$(mktemp -d)
trap 'rm -rf "$tmp_dir"' EXIT
cp -R "$fixture_dir/." "$tmp_dir/"
npm install --prefix "$tmp_dir" --no-audit --no-fund --package-lock=false "$artifact"
node -p "'Installed express-light-rail ' + require('$tmp_dir/node_modules/express-light-rail/package.json').version"
(
  cd "$tmp_dir"
  npm run typecheck
  npm test
  node smoke.mjs
)
