const mockBootstrapUseAzureMonitor = jest.fn();
const mockEnablePropertiesVolume = jest.fn();
const mockPropertiesVolumeConstructor = jest.fn(() => ({
  enableFor: mockEnablePropertiesVolume,
}));

const configValues: Record<string, unknown> = {
  'appInsights.enabled': false,
  'appInsights.insightname': 'pcs-frontend',
  'appInsights.connectionString': 'test-connection-string',
};

const loadBootstrapModule = async (): Promise<void> => {
  jest.resetModules();
  jest.doMock('config', () => ({
    get: (key: string) => configValues[key],
  }));
  jest.doMock('@azure/monitor-opentelemetry', () => ({
    useAzureMonitor: mockBootstrapUseAzureMonitor,
    shutdownAzureMonitor: jest.fn().mockResolvedValue(undefined),
  }));
  jest.doMock('@modules/properties-volume', () => ({
    PropertiesVolume: mockPropertiesVolumeConstructor,
  }));
  jest.doMock('../../main/server', () => ({}));

  await import('../../main/bootstrap');
};

describe('bootstrap', () => {
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    originalNodeEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('uses development mode when NODE_ENV is not set', async () => {
    delete process.env.NODE_ENV;
    await loadBootstrapModule();

    expect(mockPropertiesVolumeConstructor).toHaveBeenCalledWith(true);
    expect(mockEnablePropertiesVolume).toHaveBeenCalledTimes(1);
  });

  it('uses production mode when NODE_ENV is production', async () => {
    process.env.NODE_ENV = 'production';
    await loadBootstrapModule();

    expect(mockPropertiesVolumeConstructor).toHaveBeenCalledWith(false);
    expect(mockEnablePropertiesVolume).toHaveBeenCalledTimes(1);
  });

  it('does not initialise telemetry when appInsights.enabled is false', async () => {
    configValues['appInsights.enabled'] = false;
    process.env.NODE_ENV = 'production';
    await loadBootstrapModule();

    expect(mockBootstrapUseAzureMonitor).not.toHaveBeenCalled();
  });

  it('initialises telemetry when appInsights.enabled is true', async () => {
    configValues['appInsights.enabled'] = true;
    process.env.NODE_ENV = 'production';
    await loadBootstrapModule();

    expect(mockBootstrapUseAzureMonitor).toHaveBeenCalledTimes(1);
  });

  it('enables properties volume before telemetry initialization', async () => {
    configValues['appInsights.enabled'] = true;
    process.env.NODE_ENV = 'production';
    await loadBootstrapModule();

    const enablePropertiesVolumeCallOrder = mockEnablePropertiesVolume.mock.invocationCallOrder[0];
    const useAzureMonitorCallOrder = mockBootstrapUseAzureMonitor.mock.invocationCallOrder[0];

    expect(enablePropertiesVolumeCallOrder).toBeLessThan(useAzureMonitorCallOrder);
  });
});
