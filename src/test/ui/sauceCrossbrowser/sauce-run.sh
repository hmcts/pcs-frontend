#!/usr/bin/env bash
# Local / CI: mint S2S + IDAM on this machine when tokens are not already exported, then run saucectl.
# Jenkins nightly still mints in Jenkinsfile and passes env into saucectl; this path is for yarn test:crossbrowser.
# SAUCE_GREP / SAUCE_SUITE_NAME(S) behave as before.
set -euo pipefail

if git rev-parse --show-toplevel >/dev/null 2>&1; then
  cd "$(git rev-parse --show-toplevel)"
else
  _script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  cd "${_script_dir}/../../../.." || exit 1
fi

if [[ -z "${SERVICE_AUTH_TOKEN:-}" || -z "${BEARER_TOKEN:-}" ]]; then
  echo "[E2E tokens] Minting on this shell before saucectl (yarn mint:e2e-tokens-for-sauce). Export SERVICE_AUTH_TOKEN + BEARER_TOKEN to skip."
  if [[ ! -d node_modules ]]; then
    yarn ci:install
  fi
  yarn mint:e2e-tokens-for-sauce
  if [[ -f .sauce/minted-tokens.json ]]; then
    eval "$(node -e "
      const fs = require('fs');
      const j = JSON.parse(fs.readFileSync('.sauce/minted-tokens.json', 'utf8'));
      for (const [k, v] of Object.entries(j)) {
        if (typeof v === 'string' && v) process.stdout.write('export ' + k + '=' + JSON.stringify(v) + '\\n');
      }
    ")"
    rm -f .sauce/minted-tokens.json
  fi
else
  echo "[E2E tokens] SERVICE_AUTH_TOKEN + BEARER_TOKEN already set; skipping mint in sauce-run.sh."
fi

export SAUCE_GREP="${SAUCE_GREP:-@crossbrowser}"

if [[ -n "${SAUCE_SUITE_NAMES:-}" ]]; then
  exit_code=0
  for suite in ${SAUCE_SUITE_NAMES}; do
    echo "Sauce suite: ${suite}"
    if ! SAUCE_SUITE_NAME="${suite}" yarn test:sauce:nightly; then
      exit_code=1
    fi
  done
  exit "$exit_code"
fi

export SAUCE_SUITE_NAME="${SAUCE_SUITE_NAME:-pcs-frontend-mac13-chrome}"
exec yarn test:sauce:nightly
