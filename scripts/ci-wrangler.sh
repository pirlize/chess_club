#!/usr/bin/env bash
# Runs a wrangler command in CI. If it fails, its last lines become an error
# annotation on the GitHub Actions run, so the reason shows on the run page.
#
#   bash scripts/ci-wrangler.sh "<title>" <wrangler args...>
set -uo pipefail

title="$1"
shift

npx wrangler "$@" 2>&1 | tee wrangler.log
status=${PIPESTATUS[0]}

if [ "$status" -ne 0 ]; then
  # Without colour codes and blank lines; annotations are one line.
  summary=$(sed 's/\x1b\[[0-9;]*m//g' wrangler.log | grep -v '^[[:space:]]*$' | tail -n 12 | tr '\n' ' ' | cut -c1-900)
  echo "::error title=${title}::${summary}"
fi
exit "$status"
