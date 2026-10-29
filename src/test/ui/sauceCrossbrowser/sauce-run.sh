#!/usr/bin/env bash
# Jenkins: SAUCE_SUITE_NAMES → one yarn test:sauce:nightly per suite; else single suite via SAUCE_SUITE_NAME.
# SAUCE_GREP: Jenkins string param SAUCE_GREP → env (setFunctionalTestEnvVars); default here matches Jenkins default.
set -euo pipefail

export SAUCE_GREP="${SAUCE_GREP:-@crossbrowser}"

# Debug: Show environment
echo "========================================="
echo "=== SAUCE TUNNEL DEBUG (from sauce-run.sh) ==="
echo "========================================="
echo "SAUCE_TUNNEL_NAME: ${SAUCE_TUNNEL_NAME:-NOT SET}"
echo "SAUCE_REGION: ${SAUCE_REGION:-NOT SET}"
echo "SAUCE_USERNAME: ${SAUCE_USERNAME:-NOT SET}"
echo "SAUCE_ACCESS_KEY: ${SAUCE_ACCESS_KEY:+SET (hidden)}"
echo "ENVIRONMENT: ${ENVIRONMENT:-NOT SET}"
echo "TEST_URL: ${TEST_URL:-NOT SET}"
echo "PCS_API_URL: ${PCS_API_URL:-NOT SET}"
echo "DATA_STORE_URL_BASE: ${DATA_STORE_URL_BASE:-NOT SET}"
echo "========================================="

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
