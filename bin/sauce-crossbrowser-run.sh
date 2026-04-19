#!/usr/bin/env bash
# Jenkins enableCrossBrowserTest() → yarn test:crossbrowser.
# One pipeline step: if SAUCE_SUITE_NAMES is set (space-separated), runs saucectl once per suite; else single SAUCE_SUITE_NAME.
set -euo pipefail

if [[ -n "${SAUCE_SUITE_NAMES:-}" ]]; then
  for suite in ${SAUCE_SUITE_NAMES}; do
    echo "Sauce suite: ${suite}"
    SAUCE_SUITE_NAME="${suite}" yarn test:sauce:nightly
  done
  exit 0
fi

if [[ -z "${SAUCE_SUITE_NAME:-}" && -n "${BROWSER_GROUP:-}" ]]; then
  bg=$(printf '%s' "$BROWSER_GROUP" | tr '[:upper:]' '[:lower:]')
  case "$bg" in
    chrome) export SAUCE_SUITE_NAME=pcs-frontend-mac15-chrome ;;
    firefox) export SAUCE_SUITE_NAME=pcs-frontend-mac15-firefox ;;
    microsoft|edge) export SAUCE_SUITE_NAME=pcs-frontend-win11-edge ;;
    safari|webkit)
      echo "No webkit suite in config-sauce-nightly.yml; set SAUCE_SUITE_NAME." >&2
      exit 1
      ;;
    *)
      echo "Unknown BROWSER_GROUP=${BROWSER_GROUP}; set SAUCE_SUITE_NAME or SAUCE_SUITE_NAMES." >&2
      exit 1
      ;;
  esac
fi

export SAUCE_SUITE_NAME="${SAUCE_SUITE_NAME:-pcs-frontend-mac15-chrome}"
exec yarn test:sauce:nightly
