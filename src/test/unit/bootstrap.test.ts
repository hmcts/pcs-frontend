const mockInitializeTelemetry = jest.fn();
const mockEnablePropertiesVolume = jest.fn();
const mockPropertiesVolumeConstructor = jest.fn(() => ({
  enableFor: mockEnablePropertiesVolume,
}));

const loadBootstrapModule = async (): Promise<void> => {
  jest.resetModules();
  jest.doMock('@modules/opentelemetry', () => ({
    initializeTelemetry: mockInitializeTelemetry,
  }));
  jest.doMock('@modules/properties-volume', () => ({
    PropertiesVolume: mockPropertiesVolumeConstructor,
  }));
  jest.doMock('../../main/server', () => ({}));

  await import('../../main/bootstrap');
};

describe('bootstrap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.NODE_ENV;
  });

  it('uses development mode when NODE_ENV is not set', async () => {
    await loadBootstrapModule();

    expect(mockPropertiesVolumeConstructor).toHaveBeenCalledWith(true);
    expect(mockEnablePropertiesVolume).toHaveBeenCalledTimes(1);
    expect(mockInitializeTelemetry).toHaveBeenCalledTimes(1);
  });

  it('uses production mode when NODE_ENV is production', async () => {
    process.env.NODE_ENV = 'production';

    await loadBootstrapModule();

    expect(mockPropertiesVolumeConstructor).toHaveBeenCalledWith(false);
    expect(mockEnablePropertiesVolume).toHaveBeenCalledTimes(1);
    expect(mockInitializeTelemetry).toHaveBeenCalledTimes(1);
  });

  it('enables properties volume before telemetry initialization', async () => {
    await loadBootstrapModule();

    const enablePropertiesVolumeCallOrder = mockEnablePropertiesVolume.mock.invocationCallOrder[0];
    const initializeTelemetryCallOrder = mockInitializeTelemetry.mock.invocationCallOrder[0];

    expect(enablePropertiesVolumeCallOrder).toBeLessThan(initializeTelemetryCallOrder);
  });
});
