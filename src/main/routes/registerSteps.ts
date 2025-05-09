import { Application } from 'express';
import fs from 'fs';
import path from 'path';

export function registerStepRoutes(app: Application): void {
  const stepsDir = path.join(__dirname, 'steps');

  const files = fs.readdirSync(stepsDir);
  for (const file of files) {
    if (file.endsWith('.ts') || file.endsWith('.js')) {
      const route = require(path.join(stepsDir, file));
      const routePath = getRoutePath(file);
      app.use(routePath, route.default || route);
    }
  }
}

function getRoutePath(fileName: string): string {
  const name = fileName.replace(/\.(ts|js)$/, '');
  if (name === 'page3Yes') return '/steps/page3/yes';
  if (name === 'page3No') return '/steps/page3/no';
  return `/steps/${name}`;
}
