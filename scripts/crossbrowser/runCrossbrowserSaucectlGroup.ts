import {
  type CrossbrowserBrowserGroup,
  isCrossbrowserBrowserGroup,
} from '../../src/test/ui/crossbrowser/supportedBrowsers';

import { runSauceBrowserGroup } from './saucectlBrowserGroupRunner';

const group = process.env.BROWSER_GROUP ?? '';

if (!isCrossbrowserBrowserGroup(group)) {
  console.error(`BROWSER_GROUP must be "chrome" or "firefox" (got: "${group || '(empty)'}")`);
  process.exit(1);
}

process.exit(runSauceBrowserGroup(group as CrossbrowserBrowserGroup));
