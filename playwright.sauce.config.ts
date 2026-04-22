import { defineConfig } from '@playwright/test';
import type { Project } from '@playwright/test';

import baseConfig from './playwright.config';

/**
 * Sauce Labs / `saucectl` only.
 *
 * - **Jenkins / local:** use `playwright.config.ts` — no `setup` project; `global-setup.config.ts` obtains tokens.
 * - **Sauce:** `global-setup-sauce.config.ts` (locks only) + `setup` project + `auth.setup.ts` fetches tokens after tunnel is up.
 */
const setupProject: Project = {
  name: 'setup',
  testMatch: '**/setup/**/*.setup.ts',
};

const baseProjects = (baseConfig.projects ?? []) as Project[];

const projectsWithSetup: Project[] = [
  setupProject,
  ...baseProjects
    .filter(p => p.name !== 'setup')
    .map(project => ({
      ...project,
      dependencies: ['setup'],
    })),
];

export default defineConfig({
  ...baseConfig,
  workers: 1,
  globalSetup: require.resolve('./src/test/ui/config/global-setup-sauce.config.ts'),
  projects: projectsWithSetup,
});
