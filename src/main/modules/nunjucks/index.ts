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
    // eslint-disable-next-line no-console
    console.log('========================================= coming to Nunjucks =========================');

    app.set('view engine', 'njk');
    app.locals.nunjucksEnv = nunjucks.configure(path.join(__dirname, '..', '..', 'views'), {
      autoescape: true,
      watch: this.developmentMode,
      express: app,
    });

    try {
      this.addCustomFilters(app.locals.nunjucksEnv);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(e);
    }

    app.use((req, res, next) => {
      res.locals.pagePath = req.path;
      next();
    });
  }

  private addCustomFilters(nunjucksEnv: Environment) {
    const filters = path.join(path.resolve(__dirname, 'filters'), '**/*.ts');
    // eslint-disable-next-line no-console
    console.log('filters =>>>>>> ', filters, glob.sync(filters));
    glob.sync(filters).forEach(async (filename: string) => {
      // eslint-disable-next-line no-console
      console.log('filename=>', filename);
      const filter = await import(filename);
      Object.entries(filter).forEach(([key, value]) => {
        // eslint-disable-next-line no-console
        console.log('add filter => ', key);
        nunjucksEnv.addFilter(key, value as (...args: unknown[]) => unknown);
      });
    });
  }
}
