#!/usr/bin/env bash
set -euo pipefail

fixture_dir=$(cd "$(dirname "$0")/.." && pwd)
repo_root=$(cd "$fixture_dir/../../../.." && pwd)
temporary_dir=$(mktemp -d)
trap 'rm -rf "$temporary_dir"' EXIT
mkdir -p "$temporary_dir/consumer" "$temporary_dir/package"
cp -R "$fixture_dir/." "$temporary_dir/consumer/"

if [[ $# -gt 0 ]]; then
  artifact_path=$(realpath "$1")
else
  npm run --prefix "$repo_root" build
  artifact=$(npm pack "$repo_root" --pack-destination "$temporary_dir/package" --json \
    | node -e 'let input = ""; process.stdin.on("data", chunk => input += chunk); process.stdin.on("end", () => process.stdout.write(JSON.parse(input)[0].filename))')
  artifact_path="$temporary_dir/package/$artifact"
fi
cd "$temporary_dir/consumer"
npm install --no-package-lock --ignore-scripts --no-audit --no-fund
npm install --no-package-lock --ignore-scripts --no-audit --no-fund "$artifact_path"
node -p "'Installed express-light-rail ' + JSON.parse(require('node:fs').readFileSync('node_modules/express-light-rail/package.json')).version"

npx eslint src/feature.ts tests/feature.test.ts
if npx eslint src/lint-error.ts > "$temporary_dir/lint-output.txt" 2>&1; then
  echo "Expected the shared TypeScript lint rule to reject src/lint-error.ts" >&2
  exit 1
fi
node -e 'const output = require("node:fs").readFileSync(process.argv[1], "utf8"); if (!output.includes("@typescript-eslint/no-unused-vars")) process.exit(1)' "$temporary_dir/lint-output.txt"
npx prettier --config prettier.config.mjs --write src/feature.ts sql/schema.sql
node -e 'const sql = require("node:fs").readFileSync("sql/schema.sql", "utf8"); if (!sql.includes("IDENTITY(1, 1)") || !sql.includes("NVARCHAR(MAX)")) process.exit(1)'
npx vitest run --config vite.config.ts
