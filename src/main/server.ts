#!/usr/bin/env node
import * as fs from 'fs';
import * as https from 'https';
import * as path from 'path';

import { Logger } from '@hmcts/nodejs-logging';
import { type HttpTerminator, createHttpTerminator } from 'http-terminator';

import { app } from './app';

const logger = Logger.getLogger('server');

let server: https.Server | ReturnType<typeof app.listen> | null = null;
let httpTerminator: HttpTerminator | null = null;
// used by shutdownCheck in readinessChecks
app.locals.shutdown = false;

// TODO: set the right port for your application
const port: number = parseInt(process.env.PORT || '3209', 10);

if (app.locals.ENV === 'development') {
  const sslDirectory = path.join(__dirname, 'resources', 'localhost-ssl');
  const sslOptions = {
    cert: fs.readFileSync(path.join(sslDirectory, 'localhost.crt')),
    key: fs.readFileSync(path.join(sslDirectory, 'localhost.key')),
  };
  server = https.createServer(sslOptions, app);
  server.listen(port, () => {
    logger.info(`Application started: https://localhost:${port}`);
  });
} else {
  server = app.listen(port, () => {
    logger.info(`Application started: http://localhost:${port}`);
  });
}
httpTerminator = createHttpTerminator({
  server,
});

function gracefulShutdownHandler(signal: string) {
  logger.info(`⚠️ Caught ${signal}, gracefully shutting down. Setting readiness to DOWN`);
  // stop the server from accepting new connections
  app.locals.shutdown = true;

  setTimeout(async () => {
    logger.info('Shutting down application');
    
    // Clean up S2S module
    if (app.locals.s2s) {
      try {
        await app.locals.s2s.cleanup();
        logger.info('S2S module cleaned up');
      } catch (error) {
        logger.error('Error cleaning up S2S module:', error);
      }
    }

    app.locals.redisClient?.quit(async (err: Error | null) => {
      if (err) {
        logger.error('Error quitting Redis client', err);
      }
      logger.info('Redis client quit');

      if (app.locals.ENV === 'development') {
        // For HTTPS server, close it directly
        server?.close(() => {
          logger.info('HTTPS server closed');
          process.exit(0);
        });
      } else {
        // For HTTP server, use the terminator
        await httpTerminator?.terminate();
        logger.info('HTTP terminator terminated');
      }
    });
  }, 500);
}

process.on('SIGINT', gracefulShutdownHandler);
process.on('SIGTERM', gracefulShutdownHandler);
