import path from 'path';

import { Express } from 'express';
import { glob } from 'glob';

import { WizardEngine } from './engine/engine';
import { JourneyConfig } from './engine/schema';

import { Logger } from '@modules/logger';

export class Journey {
  logger = Logger.getLogger('journey');

  enableFor(app: Express): void {
    // Load all journeys defined by an `index.ts` (or .js) file inside each journey directory
    const journeyPath = path.resolve(__dirname, '..', '..', 'journeys', '**', 'index.{ts,js}');
    const journeyFiles = glob.sync(journeyPath);

    this.logger.info(`Loading ${journeyFiles.length} journeys from ${journeyPath}`);

    journeyFiles.forEach(file => {
      // Slug is the parent directory name of the index file
      const slug = path.basename(path.dirname(file));

      try {
        const journeyModule = require(file);
        const journeyConfig: JourneyConfig = journeyModule.default ?? journeyModule;
        this.logger.info(`Loaded journey from ${file}: ${journeyConfig.meta.name}`);

        const engine = new WizardEngine(journeyConfig, slug, file);
        app.use(engine.basePath, engine.router());

        if (process.env.NODE_ENV !== 'test') {
          this.logger.info(`Wizard "${engine.journey.meta.name}" mounted at ${engine.basePath}/:step (from ${file})`);
        }
      } catch (err) {
        this.logger.error(`Failed to load journey from ${file}:`, err);
        throw err;
      }
    });
  }
}
