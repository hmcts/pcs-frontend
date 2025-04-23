import * as path from 'path';

import * as express from 'express';
import { DateTime } from 'luxon';
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
    nunjucksEnv.addFilter('dateWithTime', function(isoDateTime: string) {
      return DateTime.fromISO(isoDateTime)
        .setZone('Europe/London')
        .setLocale('en-gb')
        .toFormat('d LLLL y \'at\' h:mma');
    });

    nunjucksEnv.addFilter('date', function(isoDate: string) {
      return DateTime.fromISO(isoDate)
        .setZone('Europe/London')
        .setLocale('en-gb')
        .toFormat('d LLLL y');
    });

    nunjucksEnv.addFilter('gbp', function(amount: number) {
      return '£' + amount.toFixed(2);
    });

  }

}
