#!/usr/bin/env bash
# Jenkins enableCrossBrowserTest() → yarn test:crossbrowser.
# Multi-suite: SAUCE_SUITE_NAMES → sequential saucectl; merge Allure raw results → allure-report.
# Results may be ./allure-results or ./artifacts/<suite>/allure-results (see .sauce/config-sauce-nightly.yml artifacts.download).
set -euo pipefail

MERGED="${PWD}/allure-results-sauce-merge"

dir_nonempty() {
  [[ -d "$1" ]] && [[ -n "$(ls -A "$1" 2>/dev/null || true)" ]]
}

append_last_sauce_allure() {
  mkdir -p "$MERGED"
  if dir_nonempty allure-results; then
    cp -R allure-results/. "$MERGED"/
    return 0
  fi
  if [[ -d artifacts ]]; then
    while IFS= read -r -d '' dir; do
      dir_nonempty "$dir" || continue
      cp -R "$dir"/. "$MERGED"/
    done < <(find artifacts -type d -name allure-results -print0 2>/dev/null || true)
  fi
}

sauce_allure_finalize() {
  local src="$1"
  if ! dir_nonempty "$src"; then
    echo "No Allure raw results under ${src}; skip Allure HTML for Sauce." >&2
    return 0
  fi
  yarn exec allure generate "$src" --clean -o allure-report
  yarn exec ts-node src/test/ui/config/clean-attachments.config.ts
}

if [[ -n "${SAUCE_SUITE_NAMES:-}" ]]; then
  rm -rf "$MERGED" allure-report allure-results artifacts
  mkdir -p "$MERGED"
  exit_code=0
  for suite in ${SAUCE_SUITE_NAMES}; do
    rm -rf allure-results allure-report artifacts
    echo "Sauce suite: ${suite}"
    if ! SAUCE_SUITE_NAME="${suite}" yarn test:sauce:nightly; then
      exit_code=1
    fi
    append_last_sauce_allure
  done
  sauce_allure_finalize "$MERGED"
  exit "$exit_code"
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
rm -rf allure-report allure-results artifacts
set +e
yarn test:sauce:nightly
exit_code=$?
set -e
rm -rf "$MERGED"
mkdir -p "$MERGED"
append_last_sauce_allure
sauce_allure_finalize "$MERGED"
exit "$exit_code"
