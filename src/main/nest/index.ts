import 'reflect-metadata';

import { Logger } from '@hmcts/nodejs-logging';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import type { Express } from 'express';

import { AppModule } from './app.module';

const logger = Logger.getLogger('nest-bootstrap');

export async function bootstrapNest(expressApp: Express): Promise<void> {
  const adapter = new ExpressAdapter(expressApp);

  const nestApp = await NestFactory.create(AppModule, adapter, {
    logger: ['error', 'warn', 'log'],
  });

  await nestApp.init();

  logger.info('NestJS application initialized with Express adapter');
}
