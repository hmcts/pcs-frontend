const mockGetActiveSpan = jest.fn();

jest.mock('@opentelemetry/api', () => ({
  SpanStatusCode: {
    ERROR: 'ERROR',
  },
  trace: {
    getActiveSpan: () => mockGetActiveSpan(),
  },
}));

import { recordErrorsOnActiveSpan } from '@modules/logger/active-span-errors';

interface MockSpan {
  recordException: jest.Mock;
  setStatus: jest.Mock;
}

const transform = (info: Record<string, unknown>) =>
  recordErrorsOnActiveSpan().transform({ level: 'info', message: '', ...info });

describe('recordErrorsOnActiveSpan', () => {
  let span: MockSpan;

  beforeEach(() => {
    span = { recordException: jest.fn(), setStatus: jest.fn() };
    mockGetActiveSpan.mockReturnValue(span);
  });

  it('records exception and span status for error-level logs', () => {
    transform({ level: 'error', message: 'Telemetry error' });

    expect(span.recordException).toHaveBeenCalledWith({
      name: 'Error',
      message: 'Telemetry error',
      stack: undefined,
    });
    expect(span.setStatus).toHaveBeenCalledWith({
      code: 'ERROR',
      message: 'Telemetry error',
    });
  });

  it('does not enrich spans for non-error log levels', () => {
    transform({ level: 'info', message: 'Informational log' });

    expect(span.recordException).not.toHaveBeenCalled();
    expect(span.setStatus).not.toHaveBeenCalled();
  });

  it('uses existing Error instances when recording exceptions', () => {
    const error = new Error('Boom');

    transform({ level: 'error', message: 'Request failed', error });

    expect(span.recordException).toHaveBeenCalledWith(error);
    expect(span.setStatus).toHaveBeenCalledWith({
      code: 'ERROR',
      message: 'Boom',
    });
  });

  it('passes the log through untouched when there is no active span', () => {
    mockGetActiveSpan.mockReturnValue(undefined);
    const info = { level: 'error', message: 'No span' };

    expect(transform(info)).toEqual(info);
  });

  it('uses the message itself when it is an Error', () => {
    const error = new Error('Kaboom');

    transform({ level: 'error', message: error });

    expect(span.recordException).toHaveBeenCalledWith(error);
  });

  it('serialises a non-string message', () => {
    transform({ level: 'error', message: { status: 502 } });

    expect(span.recordException).toHaveBeenCalledWith(expect.objectContaining({ message: '{"status":502}' }));
  });

  it('falls back to String() when the message cannot be serialised', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    transform({ level: 'error', message: circular });

    expect(span.recordException).toHaveBeenCalledWith(expect.objectContaining({ message: '[object Object]' }));
  });

  it('appends url, case reference and error context to the message', () => {
    transform({
      level: 'error',
      message: 'Request failed',
      url: '/case/1790173631819775/respond-to-claim',
      caseReference: '1790173631819775',
      error: 'ECONNRESET',
    });

    expect(span.recordException).toHaveBeenCalledWith(
      expect.objectContaining({
        message:
          'Request failed | url=/case/1790173631819775/respond-to-claim ' +
          'caseReference=1790173631819775 error=ECONNRESET',
      })
    );
  });

  it('keeps the record name and stack when they are present', () => {
    transform({ level: 'error', message: 'Timed out', name: 'TimeoutError', stack: 'at somewhere' });

    expect(span.recordException).toHaveBeenCalledWith({
      name: 'TimeoutError',
      message: 'Timed out',
      stack: 'at somewhere',
    });
  });

  it('treats a stringified undefined stack as no stack', () => {
    transform({ level: 'error', message: 'No stack', stack: 'undefined' });

    expect(span.recordException).toHaveBeenCalledWith(expect.objectContaining({ stack: undefined }));
  });

  it('never lets a failing span break logging', () => {
    span.recordException.mockImplementation(() => {
      throw new Error('span is broken');
    });
    const info = { level: 'error', message: 'Still logged' };

    expect(() => transform(info)).not.toThrow();
    expect(transform(info)).toEqual(info);
  });
});
