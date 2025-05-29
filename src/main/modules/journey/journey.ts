import path from 'path';

import { Logger } from '@hmcts/nodejs-logging';
import { Express } from 'express';
import { glob } from 'glob';

import { WizardEngine } from './engine/engine';
import { ccdStore } from './engine/storage/ccdStore';
import { sessionStoreFor } from './engine/storage/sessionStore';

export class Journey {
  logger = Logger.getLogger('journey');

  enableFor(app: Express): void {
    const journeyFiles = glob.sync(
        path.resolve(__dirname, '..', '..', 'journeys', '*.@(json|yaml|yml)')
      );

    journeyFiles.forEach(file => {
      const slug = path.basename(file, path.extname(file));

      const store = process.env.USE_CCD === 'true' ? ccdStore : sessionStoreFor(slug);

      const engine = new WizardEngine(file, store, slug);
      app.use(engine.basePath, engine.router());

      if (process.env.NODE_ENV !== 'test') {
        this.logger.info(`Wizard "${engine.journey.meta.name}" mounted at ${engine.basePath}/:caseId/:step`);
      }
    });
  }
}
