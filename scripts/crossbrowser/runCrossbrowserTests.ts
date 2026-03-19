import {
  type CrossbrowserBrowserGroup,
  isCrossbrowserBrowserGroup,
} from '../../src/test/ui/crossbrowser/supportedBrowsers';

import { runSauceBrowserGroup } from './saucectlBrowserGroupRunner';

const groups: CrossbrowserBrowserGroup[] = ['chrome', 'firefox'];

if (!process.env.BROWSER_GROUP) {
  let exitStatus = 0;
  for (const g of groups) {
    const code = runSauceBrowserGroup(g);
    if (code !== 0) {
      exitStatus = code;
    }
  }
  process.exit(exitStatus);
}

const group = process.env.BROWSER_GROUP;
if (!isCrossbrowserBrowserGroup(group)) {
  console.error(`BROWSER_GROUP must be "chrome" or "firefox" (got: "${group}")`);
  process.exit(1);
}

process.exit(runSauceBrowserGroup(group));
