#!/bin/sh
set -eu

PACKAGE_TGZ=${1:?Usage: smoke.sh /absolute/path/to/express-light-rail-<version>.tgz}
case "$PACKAGE_TGZ" in
  /*) ;;
  *) PACKAGE_TGZ="$(pwd)/$PACKAGE_TGZ" ;;
esac
[ -f "$PACKAGE_TGZ" ] || { printf 'Package tarball not found: %s\n' "$PACKAGE_TGZ" >&2; exit 1; }

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
for consumer in travel elcc; do
  printf '\n== %s consumer (%s) ==\n' "$consumer" "$PACKAGE_TGZ"
  cd "$SCRIPT_DIR/$consumer"
  npm install --package-lock=false
  npm install --no-save --package-lock=false "$PACKAGE_TGZ"
  installed_version=$(node -p "require('./node_modules/express-light-rail/package.json').version")
  case "$PACKAGE_TGZ" in
    *"express-light-rail-$installed_version.tgz") ;;
    *) printf 'Installed version %s does not match tarball %s\n' "$installed_version" "$PACKAGE_TGZ" >&2; exit 1 ;;
  esac
  printf 'Node %s; installed express-light-rail %s\n' "$(node --version)" "$installed_version"
  npm run typecheck
  npm test
  node ../smoke-esm.mjs
  node ../smoke-cjs.cjs
done
