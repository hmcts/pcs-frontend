import * as path from 'path';

import * as express from 'express';
import { glob } from 'glob';
import { Environment } from 'nunjucks';
import * as nunjucks from 'nunjucks';

export class Nunjucks {
  constructor(public developmentMode: boolean) {
    this.developmentMode = developmentMode;
  }

  enableFor(app: express.Express): void {
    app.set('view engine', 'njk');
    app.locals.nunjucksEnv = nunjucks.configure(path.join(__dirname, '..', '..', 'views'), {
      autoescape: true,
      watch: this.developmentMode,
      express: app,
    });

    this.addCustomFilters(app.locals.nunjucksEnv);

    app.use((req, res, next) => {
      res.locals.pagePath = req.path;
      next();
    });
  }

  private addCustomFilters(nunjucksEnv: Environment) {
    glob.sync(path.join(__dirname, '/filters/**/*.ts')).forEach(async (filename: string) => {
      const filter = await import(filename);
      Object.entries(filter).forEach(([key, value]) => {
        nunjucksEnv.addFilter(key, value as (...args: unknown[]) => unknown);
      });
    });
    glob.sync(path.join(__dirname, '/filters/**/*.ts')).map(async (filename: string) => {
      const filter = await import(filename);
      for (const [key, value] of Object.entries(filter)) {
        nunjucksEnv.addFilter(key, value as (...args: unknown[]) => unknown);
      }
    });
  }
}
