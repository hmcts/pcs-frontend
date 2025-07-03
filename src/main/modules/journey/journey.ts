import path from 'path';

import { Logger } from '@hmcts/nodejs-logging';
import { Express } from 'express';
import { glob } from 'glob';

import { WizardEngine } from './engine/engine';

export class Journey {
  logger = Logger.getLogger('journey');

  enableFor(app: Express): void {
    const journeyFiles = glob.sync(path.resolve(__dirname, '..', '..', 'journeys', '*.json'));

    journeyFiles.forEach(file => {
      const slug = path.basename(file, path.extname(file));

      const engine = new WizardEngine(file, slug);
      app.use(engine.basePath, engine.router());

      if (process.env.NODE_ENV !== 'test') {
        this.logger.info(`Wizard "${engine.journey.meta.name}" mounted at ${engine.basePath}/:step`);
      }
    });
  }
}
