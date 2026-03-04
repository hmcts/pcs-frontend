import winston from 'winston';

import { Logger } from '../../../../main/modules/logger';

const ansiEscapePattern = new RegExp(String.raw`\u001b\[[0-9;]*m`, 'g');
const stripAnsiCodes = (value: string): string => value.replace(ansiEscapePattern, '');
const messageSymbol = Symbol.for('message');

describe('logger module', () => {
  const formattedLines: string[] = [];
  let transportLogSpy: jest.SpyInstance;

  beforeEach(() => {
    formattedLines.length = 0;
    process.env.LOG_LEVEL = 'info';
    delete process.env.JSON_PRINT;

    transportLogSpy = jest
      .spyOn(winston.transports.Console.prototype, 'log')
      .mockImplementation((...args: unknown[]) => {
        const info = (args[0] ?? {}) as Record<PropertyKey, unknown>;
        const next = args[1] as (() => void) | undefined;
        const message = typeof info[messageSymbol] === 'string' ? info[messageSymbol] : info.message;
        formattedLines.push(String(message ?? ''));
        next?.();
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
});
