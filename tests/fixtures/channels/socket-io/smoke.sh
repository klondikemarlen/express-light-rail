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

fixture_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
tmp_dir=$(mktemp -d)
trap 'rm -rf "$tmp_dir"' EXIT
cp -R "$fixture_dir/." "$tmp_dir/"

expected_version=$(tar -xOzf "$artifact" package/package.json | node -e '
  let source = ""
  process.stdin.setEncoding("utf8")
  process.stdin.on("data", (chunk) => { source += chunk })
  process.stdin.on("end", () => process.stdout.write(JSON.parse(source).version))
')
npm install --prefix "$tmp_dir" --no-audit --no-fund --package-lock=false "$artifact"
installed_version=$(node -e '
  const { readFileSync } = require("node:fs")
  const installedPackage = JSON.parse(readFileSync(process.argv[1], "utf8"))
  process.stdout.write(installedPackage.version)
' "$tmp_dir/node_modules/express-light-rail/package.json")
printf 'Installed express-light-rail %s (artifact %s)\n' "$installed_version" "$expected_version"
if [[ "$installed_version" != "$expected_version" ]]; then
  echo "installed package version does not match the supplied artifact" >&2
  exit 1
fi

(
  cd "$tmp_dir"
  npm run typecheck
  npm test
  node smoke.mjs
)
