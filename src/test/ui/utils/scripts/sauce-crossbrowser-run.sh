#!/usr/bin/env bash
# Jenkins: SAUCE_SUITE_NAMES → one yarn test:sauce:nightly per suite; else single suite via SAUCE_SUITE_NAME.
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

export SAUCE_SUITE_NAME="${SAUCE_SUITE_NAME:-pcs-frontend-mac13-chrome}"
exec yarn test:sauce:nightly
