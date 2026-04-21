#!/usr/bin/env bash
# Jenkins enableCrossBrowserTest() → yarn test:crossbrowser.
# Multi-suite: SAUCE_SUITE_NAMES → sequential saucectl runs (one yarn test:sauce:nightly per suite).
set -euo pipefail

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

if [[ -z "${SAUCE_SUITE_NAME:-}" && -n "${BROWSER_GROUP:-}" ]]; then
  bg=$(printf '%s' "$BROWSER_GROUP" | tr '[:upper:]' '[:lower:]')
  case "$bg" in
    chrome) export SAUCE_SUITE_NAME=pcs-frontend-mac13-chrome ;;
    firefox) export SAUCE_SUITE_NAME=pcs-frontend-mac13-firefox ;;
    microsoft|edge) export SAUCE_SUITE_NAME=pcs-frontend-win11-edge ;;
    safari|webkit) export SAUCE_SUITE_NAME=pcs-frontend-mac13-webkit ;;
    *)
      echo "Unknown BROWSER_GROUP=${BROWSER_GROUP}; set SAUCE_SUITE_NAME or SAUCE_SUITE_NAMES." >&2
      exit 1
      ;;
  esac
fi

export SAUCE_SUITE_NAME="${SAUCE_SUITE_NAME:-pcs-frontend-mac13-chrome}"
exec yarn test:sauce:nightly
