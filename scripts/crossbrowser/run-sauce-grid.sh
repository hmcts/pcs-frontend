#!/usr/bin/env bash
# test:crossbrowsergrid — Playwright on agent; remote Chrome on Sauce. Exit 2 = missing creds (skip Allure).
set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

if [[ ! -d "${ROOT}/node_modules/ts-node" ]]; then
  echo "ts-node not found. Run: yarn install" >&2
  exit 1
fi

node -r ts-node/register/transpile-only scripts/crossbrowser/runSauceGridCrossbrowser.ts
EXIT_CODE=$?

if [ "$EXIT_CODE" -ne 2 ]; then
  allure generate --clean
  ts-node src/test/ui/config/clean-attachments.config.ts
fi

exit "$EXIT_CODE"
