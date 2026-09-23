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
});
