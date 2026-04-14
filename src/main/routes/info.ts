import * as os from 'os';

import { InfoContributor, infoRequestHandler } from '@hmcts/info-provider';
import config from 'config';
import { Router } from 'express';

const apiUrl: string = config.get('api.url');
const apiHealthUrl = `${apiUrl}/health`;

export default function (app: Router): void {
  app.get(
    '/info',
    infoRequestHandler({
      extraBuildInfo: {
        host: os.hostname(),
        name: 'pcs-frontend',
        uptime: process.uptime(),
      },
      info: {
        'pcs-api': new InfoContributor(apiHealthUrl),
      },
    })
  );
}
