const mockUseAzureMonitor = jest.fn();
const mockShutdownAzureMonitor = jest.fn();
const mockConfigGet = jest.fn();

jest.mock('@azure/monitor-opentelemetry', () => ({
  useAzureMonitor: mockUseAzureMonitor,
  shutdownAzureMonitor: mockShutdownAzureMonitor,
}));

jest.mock('@opentelemetry/api', () => ({
  SpanStatusCode: {
    ERROR: 'ERROR',
  },
}));

jest.mock('config', () => ({
  get: mockConfigGet,
}));

interface TelemetryConfig {
  azureMonitorExporterOptions: {
    connectionString: string;
  };
  instrumentationOptions: {
    http: {
      ignoreIncomingRequestHook: (request: { method?: string; url?: string }) => boolean;
      ignoreOutgoingRequestHook: (options: { path?: string }) => boolean;
    };
    winston: {
      logHook: (span: MockSpan, record: Record<string, unknown>) => void;
    };
  };
  enableLiveMetrics: boolean;
}

interface MockSpan {
  recordException: jest.Mock;
  setStatus: jest.Mock;
}

const getTelemetryModule = async () => {
  jest.resetModules();
  return import('../../../../main/modules/opentelemetry');
};

const initializeAndGetTelemetryConfig = async (): Promise<TelemetryConfig> => {
  const telemetryModule = await getTelemetryModule();
  telemetryModule.initializeTelemetry();

  return mockUseAzureMonitor.mock.calls[0][0] as TelemetryConfig;
};

describe('opentelemetry module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConfigGet.mockImplementation((key: string) =>
      key === 'appInsights.insightname' ? 'pcs-frontend' : 'InstrumentationKey=test-key'
    );
    delete process.env.OTEL_SERVICE_NAME;
    jest.useRealTimers();
  });

  it('initializes Azure Monitor with expected configuration', async () => {
    const telemetryModule = await getTelemetryModule();

    telemetryModule.initializeTelemetry();

    expect(mockUseAzureMonitor).toHaveBeenCalledTimes(1);
    expect(mockUseAzureMonitor).toHaveBeenCalledWith(
      expect.objectContaining({
        azureMonitorExporterOptions: {
          connectionString: 'InstrumentationKey=test-key',
        },
        enableLiveMetrics: true,
      })
    );

    expect(process.env.OTEL_SERVICE_NAME).toBe('pcs-frontend');
  });

  it('does not initialize telemetry more than once', async () => {
    const telemetryModule = await getTelemetryModule();

    telemetryModule.initializeTelemetry();
    telemetryModule.initializeTelemetry();

    expect(mockUseAzureMonitor).toHaveBeenCalledTimes(1);
  });

  it('ignores OPTIONS and static incoming requests', async () => {
    const telemetryConfig = await initializeAndGetTelemetryConfig();
    const { ignoreIncomingRequestHook } = telemetryConfig.instrumentationOptions.http;

    expect(ignoreIncomingRequestHook({ method: 'OPTIONS', url: '/foo' })).toBe(true);
    expect(ignoreIncomingRequestHook({ method: 'GET', url: '/assets/main.css' })).toBe(true);
    expect(ignoreIncomingRequestHook({ method: 'GET', url: '/main.js?v=1' })).toBe(true);
    expect(ignoreIncomingRequestHook({ method: 'GET', url: '/case/123' })).toBe(false);
  });

  it('ignores health outgoing requests', async () => {
    const telemetryConfig = await initializeAndGetTelemetryConfig();
    const { ignoreOutgoingRequestHook } = telemetryConfig.instrumentationOptions.http;

    expect(ignoreOutgoingRequestHook({ path: '/health' })).toBe(true);
    expect(ignoreOutgoingRequestHook({ path: '/health?check=true' })).toBe(true);
    expect(ignoreOutgoingRequestHook({ path: '/healthz' })).toBe(false);
  });

  it('records exception and span status for error-level logs', async () => {
    const telemetryConfig = await initializeAndGetTelemetryConfig();
    const span: MockSpan = {
      recordException: jest.fn(),
      setStatus: jest.fn(),
    };

    telemetryConfig.instrumentationOptions.winston.logHook(span, {
      level: 'error',
      message: 'Telemetry error',
    });

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

  it('does not enrich spans for non-error log levels', async () => {
    const telemetryConfig = await initializeAndGetTelemetryConfig();
    const span: MockSpan = {
      recordException: jest.fn(),
      setStatus: jest.fn(),
    };

    telemetryConfig.instrumentationOptions.winston.logHook(span, {
      level: 'info',
      message: 'Informational log',
    });

    expect(span.recordException).not.toHaveBeenCalled();
    expect(span.setStatus).not.toHaveBeenCalled();
  });

  it('uses existing Error instances when recording exceptions', async () => {
    const telemetryConfig = await initializeAndGetTelemetryConfig();
    const span: MockSpan = {
      recordException: jest.fn(),
      setStatus: jest.fn(),
    };
    const error = new Error('Boom');

    telemetryConfig.instrumentationOptions.winston.logHook(span, {
      level: 'error',
      error,
    });

    expect(span.recordException).toHaveBeenCalledWith(error);
    expect(span.setStatus).toHaveBeenCalledWith({
      code: 'ERROR',
      message: 'Boom',
    });
  });

  it('returns early when flushing before initialization', async () => {
    const telemetryModule = await getTelemetryModule();

    await telemetryModule.flushTelemetry();

    expect(mockShutdownAzureMonitor).not.toHaveBeenCalled();
  });

  it('flushes telemetry once even for concurrent callers', async () => {
    const telemetryModule = await getTelemetryModule();
    mockShutdownAzureMonitor.mockResolvedValue(undefined);

    telemetryModule.initializeTelemetry();
    await Promise.all([telemetryModule.flushTelemetry(), telemetryModule.flushTelemetry()]);

    expect(mockShutdownAzureMonitor).toHaveBeenCalledTimes(1);
  });

  it('logs shutdown failures without throwing', async () => {
    const telemetryModule = await getTelemetryModule();
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const shutdownError = new Error('shutdown failed');
    mockShutdownAzureMonitor.mockRejectedValue(shutdownError);

    telemetryModule.initializeTelemetry();
    await expect(telemetryModule.flushTelemetry()).resolves.toBeUndefined();

    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to flush telemetry cleanly', shutdownError);
    consoleErrorSpy.mockRestore();
  });

  it('times out flush when shutdown does not settle', async () => {
    const telemetryModule = await getTelemetryModule();
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    mockShutdownAzureMonitor.mockReturnValue(new Promise<void>(() => {}));
    jest.useFakeTimers();

    telemetryModule.initializeTelemetry();
    const flushPromise = telemetryModule.flushTelemetry(10);
    jest.advanceTimersByTime(10);
    await flushPromise;

    expect(consoleErrorSpy).toHaveBeenCalledWith('Telemetry shutdown timed out after 10ms');
    consoleErrorSpy.mockRestore();
  });
});
