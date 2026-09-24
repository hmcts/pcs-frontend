import { logs } from '@opentelemetry/api-logs';
import winston from 'winston';

import { Logger } from '@modules/logger';

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

  it('exports logs from loggers created before and after telemetry starts', () => {
    const earlyLogger = Logger.getLogger(`logger-otel-early-${Date.now()}`);
    const emit = jest.fn();
    logs.setGlobalLoggerProvider({ getLogger: () => ({ emit, enabled: () => true }) });

    try {
      Logger.enableTelemetry();
      const lateLogger = Logger.getLogger(`logger-otel-late-${Date.now()}`);
      earlyLogger.error('Could not reach CCD', { caseReference: '1234' });
      lateLogger.warn('Retrying');
    } finally {
      logs.disable();
    }

    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({
        body: 'Could not reach CCD',
        severityText: 'error',
        attributes: expect.objectContaining({ caseReference: '1234' }),
      })
    );
    expect(emit).toHaveBeenCalledWith(expect.objectContaining({ body: 'Retrying', severityText: 'warn' }));
  });

  it('does not export info logs, which bypass trace sampling entirely (HDPI-8953)', () => {
    const emit = jest.fn();
    logs.setGlobalLoggerProvider({ getLogger: () => ({ emit, enabled: () => true }) });

    try {
      Logger.enableTelemetry();
      const logger = Logger.getLogger(`logger-otel-level-${Date.now()}`);
      logger.info('Calling submitEvent with URL: http://ccd/cases, eventId: respondPossessionClaim');
      logger.warn('Retrying');
    } finally {
      logs.disable();
    }

    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith(expect.objectContaining({ severityText: 'warn' }));
  });

  it('strips query values before a record reaches the console or App Insights (HDPI-8953)', () => {
    const emit = jest.fn();
    logs.setGlobalLoggerProvider({ getLogger: () => ({ emit, enabled: () => true }) });

    try {
      Logger.enableTelemetry();
      const logger = Logger.getLogger(`logger-otel-redact-${Date.now()}`);
      // The OIDC callback URL: logging it verbatim ships the authorization code to App Insights.
      logger.error('Authentication error details:', { url: '/oauth2/callback?code=secret-code&state=abc' });
    } finally {
      logs.disable();
    }

    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({
        attributes: expect.objectContaining({ url: '/oauth2/callback?code=***&state=***' }),
      })
    );
    expect(JSON.stringify(emit.mock.calls)).not.toContain('secret-code');
  });

  it('strips query values passed positionally, as the 404 handler logs them', () => {
    const logger = Logger.getLogger(`logger-redact-splat-${Date.now()}`);

    logger.error('Page not found', '/oauth2/callback?code=secret-code&state=abc');

    const output = stripAnsiCodes(formattedLines.join('\n'));
    expect(output).toContain('/oauth2/callback?code=***&state=***');
    expect(output).not.toContain('secret-code');
  });

  it('strips query values embedded in the message itself', () => {
    const logger = Logger.getLogger(`logger-redact-message-${Date.now()}`);

    logger.info('Calling getEventToken with URL: http://ccd/cases/1?ignore-warning=false&key=secret-key');

    const output = stripAnsiCodes(formattedLines.join('\n'));
    expect(output).toContain('http://ccd/cases/1?ignore-warning=***&key=***');
    expect(output).not.toContain('secret-key');
  });

  it('reuses the logger for a name so telemetry is never attached twice', () => {
    const name = `logger-reuse-${Date.now()}`;
    const first = Logger.getLogger(name);
    const transportCount = first.transports.length;

    const second = Logger.getLogger(name);

    expect(second).toBe(first);
    expect(second.transports).toHaveLength(transportCount);
  });

  it('only attaches the telemetry transport once however often telemetry starts', () => {
    const logger = Logger.getLogger(`logger-enable-twice-${Date.now()}`);
    const emit = jest.fn();
    logs.setGlobalLoggerProvider({ getLogger: () => ({ emit, enabled: () => true }) });

    try {
      Logger.enableTelemetry();
      Logger.enableTelemetry();
      logger.error('Exported once');
    } finally {
      logs.disable();
    }

    expect(emit).toHaveBeenCalledTimes(1);
  });
});
