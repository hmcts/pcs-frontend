#!/usr/bin/env bash
# Run Playwright on this machine (Jenkins agent / local) while the browser runs on Sauce Labs.
# API calls in globalSetup / beforeEach use HMCTS network from here — same model as probate-frontend WebDriver → Sauce.
# See https://docs.saucelabs.com/web-apps/automated-testing/playwright/selenium-grid/
# and https://playwright.dev/docs/selenium-grid
set -euo pipefail

if [[ -z "${SAUCE_USERNAME:-}" || -z "${SAUCE_ACCESS_KEY:-}" ]]; then
  echo "Set SAUCE_USERNAME and SAUCE_ACCESS_KEY (Sauce user settings)." >&2
  exit 1
fi

export SELENIUM_REMOTE_URL="${SELENIUM_REMOTE_URL:-https://ondemand.eu-central-1.saucelabs.com/wd/hub}"

# Smaller desktop = larger UI in Sauce video. Must be a Sauce-supported resolution for the OS/browser (1280x720 is not valid on Windows 11 Chrome).
# See https://docs.saucelabs.com/dev/test-configuration-options/#screenresolution
export SAUCE_SCREEN_RESOLUTION="${SAUCE_SCREEN_RESOLUTION:-1280x960}"

export SELENIUM_REMOTE_CAPABILITIES="$(
  node <<'NODE'
const cap = {
  platformName: process.env.SAUCE_PLATFORM_NAME || 'Windows 11',
  browserName: 'chrome',
  'sauce:options': {
    username: process.env.SAUCE_USERNAME,
    accessKey: process.env.SAUCE_ACCESS_KEY,
    devTools: true,
    screenResolution: process.env.SAUCE_SCREEN_RESOLUTION || '1280x960',
    name: process.env.SAUCE_JOB_NAME || 'pcs-frontend-crossbrowser',
    build: process.env.BUILD_NUMBER || process.env.BUILD_ID || 'local',
    tags: ['pcs-frontend', 'crossbrowser', 'playwright'],
  },
};
console.log(JSON.stringify(cap));
NODE
)"

yarn playwright install
EXIT_CODE=0
yarn playwright test --project chrome --grep '@crossbrowser' --headed "$@" || EXIT_CODE=$?
allure generate --clean
ts-node src/test/ui/config/clean-attachments.config.ts
exit "$EXIT_CODE"
