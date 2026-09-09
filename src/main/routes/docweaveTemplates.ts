import { createTemplateProxy } from '@hmcts-cft/docweave/express';
import config from 'config';
import type { Application } from 'express';

import { judgeAccessMiddleware, oidcMiddleware } from '../middleware';

import { http } from '@modules/http';

export default function docweaveTemplateRoutes(app: Application): void {
  app.use(
    '/docweave/templates',
    oidcMiddleware,
    judgeAccessMiddleware,
    createTemplateProxy({
      upstream: `${config.get<string>('api.url')}/docweave/templates`,
      getUserToken: request => request.session.user?.accessToken,
      getServiceToken: () => http.getValidS2SToken(),
    })
  );
}
