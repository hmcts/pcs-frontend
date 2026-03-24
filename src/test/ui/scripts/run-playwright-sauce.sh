#!/usr/bin/env bash
# Hybrid: Playwright on agent, browser on Sauce (Selenium Grid). See https://playwright.dev/docs/selenium-grid
set -euo pipefail

if [[ -z "${SAUCE_USERNAME:-}" || -z "${SAUCE_ACCESS_KEY:-}" ]]; then
  echo "Set SAUCE_USERNAME and SAUCE_ACCESS_KEY (Sauce user settings)." >&2
  exit 1
fi

export SELENIUM_REMOTE_URL="${SELENIUM_REMOTE_URL:-https://ondemand.eu-central-1.saucelabs.com/wd/hub}"
export SAUCE_PLAYWRIGHT_REGION="${SAUCE_PLAYWRIGHT_REGION:-eu-central-1}"

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

E2E_GREP="${E2E_GREP:-@crossbrowser}"

yarn playwright install
EXIT_CODE=0
yarn playwright test --config playwright.sauce.config.ts --project chrome --grep "${E2E_GREP}" --headed "$@" || EXIT_CODE=$?
allure generate --clean
ts-node src/test/ui/config/clean-attachments.config.ts

echo "Allure: yarn test:openAllureReport  ·  Sauce EU: https://app.eu-central-1.saucelabs.com/"
exit "$EXIT_CODE"
