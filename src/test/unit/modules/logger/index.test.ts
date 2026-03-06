import winston from 'winston';

import { Logger } from '../../../../main/modules/logger';

const ansiEscapePattern = new RegExp(String.raw`\u001b\[[0-9;]*m`, 'g');
const stripAnsiCodes = (value: string): string => value.replace(ansiEscapePattern, '');
const messageSymbol = Symbol.for('message');

describe('logger module', () => {
  const formattedLines: string[] = [];
  const rawPayloads: Record<PropertyKey, unknown>[] = [];
  let transportLogSpy: jest.SpyInstance;

  beforeEach(() => {
    formattedLines.length = 0;
    rawPayloads.length = 0;
    process.env.LOG_LEVEL = 'info';
    delete process.env.JSON_PRINT;

    transportLogSpy = jest
      .spyOn(winston.transports.Console.prototype, 'log')
      .mockImplementation((...args: unknown[]) => {
        const next = args.find((arg): arg is () => void => typeof arg === 'function');

        if (typeof args[0] === 'string' && typeof args[1] === 'string') {
          const meta = args[2];
          formattedLines.push(`${args[1]}${meta ? ` ${JSON.stringify(meta)}` : ''}`);
          next?.();
          return true;
        }

        const info = (args[0] ?? {}) as Record<PropertyKey, unknown>;
        rawPayloads.push(info);
        const message = typeof info[messageSymbol] === 'string' ? info[messageSymbol] : info.message;
        formattedLines.push(String(message ?? ''));
        next?.();
        return true;
      });
  });

  afterEach(() => {
    transportLogSpy.mockRestore();
    delete process.env.LOG_LEVEL;
  });

  it('logs trailing arguments without printf placeholders', () => {
    const logger = Logger.getLogger(`logger-trailing-${Date.now()}`);

    logger.info('Fetch config from:', 'https://issuer.example', { source: 'oidc' });

    const output = stripAnsiCodes(formattedLines.join('\n'));
    expect(output).toContain('Fetch config from:');
    expect(output).toContain('https://issuer.example');
    expect(output).toContain('"source":"oidc"');
    expect(output).not.toContain('https://issuer.example https://issuer.example');
  });

  it('logs additional arguments after placeholder interpolation', () => {
    const logger = Logger.getLogger(`logger-placeholder-${Date.now()}`);

    logger.info('Connecting to %s', 'redis', { healthy: true });

    const output = stripAnsiCodes(formattedLines.join('\n'));
    expect(output).toContain('Connecting to redis');
    expect(output).toContain('"healthy":true');
    expect(output).not.toContain('Connecting to redis redis');
  });

  it('reuses the same logger instance for the same name', () => {
    const loggerA = Logger.getLogger('logger-cache');
    const loggerB = Logger.getLogger('logger-cache');

    expect(loggerA).toBe(loggerB);
  });

  it('logs JSON output when JSON_PRINT is enabled', () => {
    process.env.JSON_PRINT = 'true';
    const logger = Logger.getLogger(`logger-json-${Date.now()}`);

    logger.info('JSON payload', { healthy: true });

    const output = formattedLines.join('\n');
    expect(output).toContain('"logger":"logger-json-');
    expect(output).toContain('"healthy":true');
    expect(output).toContain('"message":"JSON payload"');
  });

  it('accepts array metadata values without breaking log output', () => {
    const logger = Logger.getLogger(`logger-metadata-${Date.now()}`);
    const circular: { self?: unknown } = {};
    circular.self = circular;
    const err = new Error('Boom');

    logger.log({
      level: 'info',
      message: 'Array metadata',
      metadata: ['alpha', undefined, err, circular],
    });

    const output = stripAnsiCodes(formattedLines.join('\n'));
    expect(output).toContain('Array metadata');
  });

  it('omits empty object metadata from text output', () => {
    const logger = Logger.getLogger(`logger-empty-object-${Date.now()}`);

    logger.log({
      level: 'info',
      message: 'No metadata noise',
      metadata: {},
    });

    const output = stripAnsiCodes(formattedLines.join('\n'));
    expect(output).toContain('No metadata noise');
    expect(output).not.toContain('{}');
  });

  it('accepts error metadata without breaking log output', () => {
    const logger = Logger.getLogger(`logger-error-${Date.now()}`);
    const err = new Error('Boom');

    logger.log({
      level: 'info',
      message: 'Error metadata',
      metadata: err,
    });

    const output = stripAnsiCodes(formattedLines.join('\n'));
    expect(output).toContain('Error metadata');
  });
});
