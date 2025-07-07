import path from 'path';

import { Logger } from '@hmcts/nodejs-logging';
import { Express } from 'express';
import { glob } from 'glob';

import { WizardEngine } from './engine/engine';

export class Journey {
  logger = Logger.getLogger('journey');

  enableFor(app: Express): void {
    // Load all journeys defined by an `index.ts` (or .js) file inside each journey directory
    const journeyFiles = glob.sync(path.resolve(__dirname, '..', '..', 'journeys', '**', 'index.{ts,js}'));

    journeyFiles.forEach(file => {
      // Slug is the parent directory name of the index file
      const slug = path.basename(path.dirname(file));

      const journeyModule = require(file);
      const journeyConfig = (journeyModule.default ?? journeyModule) as import('./engine/schema').JourneyConfig;

      const engine = new WizardEngine(journeyConfig, slug);
      app.use(engine.basePath, engine.router());

      if (process.env.NODE_ENV !== 'test') {
        this.logger.info(`Wizard "${engine.journey.meta.name}" mounted at ${engine.basePath}/:step`);
      }
    });
  }
}
