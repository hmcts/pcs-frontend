#!/usr/bin/env bash
# Jenkins enableCrossBrowserTest() → yarn test:crossbrowser.
# Multi-suite: SAUCE_SUITE_NAMES → sequential saucectl; merge Allure raw results → allure-report.
# Results may be ./allure-results or ./artifacts/<suite>/allure-results (see .sauce/config-sauce-nightly.yml artifacts.download).
set -euo pipefail

MERGED="${PWD}/allure-results-sauce-merge"

dir_nonempty() {
  [[ -d "$1" ]] && [[ -n "$(ls -A "$1" 2>/dev/null || true)" ]]
}

# Copy latest Sauce Allure raw results into MERGED (prefers ./allure-results, else artifacts/**/allure-results).
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
  local src=$1
  if ! dir_nonempty "$src"; then
    echo "No Allure raw results under ${src}; skip Allure HTML for Sauce." >&2
    return 0
  fi
  yarn exec allure generate "$src" --clean -o allure-report
  yarn exec ts-node src/test/ui/config/clean-attachments.config.ts
}

# If SAUCE_SUITE_NAME is unset, map BROWSER_GROUP (Jenkins) to a suite from config-sauce-nightly.yml.
map_browser_group() {
  [[ -n "${SAUCE_SUITE_NAME:-}" || -z "${BROWSER_GROUP:-}" ]] && return 0
  local bg
  bg=$(printf '%s' "$BROWSER_GROUP" | tr '[:upper:]' '[:lower:]')
  case "$bg" in
    chrome) SAUCE_SUITE_NAME=pcs-frontend-mac15-chrome ;;
    firefox) SAUCE_SUITE_NAME=pcs-frontend-mac15-firefox ;;
    microsoft|edge) SAUCE_SUITE_NAME=pcs-frontend-win11-edge ;;
    safari|webkit)
      echo "No webkit suite in config-sauce-nightly.yml; set SAUCE_SUITE_NAME." >&2
      return 1
      ;;
    *)
      echo "Unknown BROWSER_GROUP=${BROWSER_GROUP}; set SAUCE_SUITE_NAME or SAUCE_SUITE_NAMES." >&2
      return 1
      ;;
  esac
}

suites=()
if [[ -n "${SAUCE_SUITE_NAMES:-}" ]]; then
  read -ra suites <<< "${SAUCE_SUITE_NAMES}"
else
  map_browser_group || exit 1
  suites=("${SAUCE_SUITE_NAME:-pcs-frontend-mac15-chrome}")
fi

rm -rf "$MERGED" allure-report allure-results artifacts
mkdir -p "$MERGED"

exit_code=0
for suite in "${suites[@]}"; do
  rm -rf allure-results allure-report artifacts
  echo "Sauce suite: ${suite}"
  set +e
  SAUCE_SUITE_NAME="${suite}" yarn test:sauce:nightly
  rc=$?
  set -e
  [[ $rc -eq 0 ]] || exit_code=1
  append_last_sauce_allure
done

sauce_allure_finalize "$MERGED"
exit "$exit_code"
