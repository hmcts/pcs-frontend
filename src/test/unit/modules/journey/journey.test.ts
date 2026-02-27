import path from 'path';

// Mock the external logger first so any module that requires it later will receive the mock
const loggerInstance = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

jest.mock('@modules/logger', () => ({
  Logger: {
    getLogger: jest.fn(() => loggerInstance),
  },
}));

// Mock glob so we can control what files are returned for discovery
const globSyncMock = jest.fn();
jest.mock('glob', () => ({
  glob: { sync: globSyncMock },
}));

// Keep a reference to the WizardEngine constructor so we can tweak its behaviour per-test
const wizardEngineCtorMock = jest.fn();
jest.mock('../../../../main/modules/journey/engine/engine', () => ({
  WizardEngine: wizardEngineCtorMock,
}));

// Helper to create a fake JourneyConfig module for a given file path so that require(file) succeeds
const createVirtualJourneyModule = (filePath: string): void => {
  jest.doMock(
    filePath,
    () => ({
      default: {
        meta: {
          name: 'Test Journey',
        },
      }, // The real contents are irrelevant for these unit tests
    }),
    { virtual: true }
  );
};

// Import the class under test *after* setting up all our mocks so that they take effect

const { Journey } = require('../../../../main/modules/journey/journey');

describe('Journey.enableFor', () => {
  const ORIGINAL_ENV = process.env.NODE_ENV;

  beforeEach(() => {
    // Ensure we always run in test mode
    process.env.NODE_ENV = 'test';

    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env.NODE_ENV = ORIGINAL_ENV;
  });

  it('mounts every discovered journey at its base path', () => {
    // Arrange – simulate two journey definition files
    const firstFile = path.join('/tmp', 'example1', 'index.ts');
    const secondFile = path.join('/tmp', 'example2', 'index.js');
    globSyncMock.mockReturnValue([firstFile, secondFile]);

    // Create virtual modules so require(file) inside enableFor() succeeds
    createVirtualJourneyModule(firstFile);
    createVirtualJourneyModule(secondFile);

    // Mock WizardEngine so that each instantiation exposes a predictable API
    wizardEngineCtorMock.mockImplementation((_cfg: unknown, slug: string) => ({
      basePath: `/${slug}`,
      journey: { meta: { name: `Journey for ${slug}` } },
      router: jest.fn(() => `router-${slug}`),
    }));

    const app = { use: jest.fn() };
    const journey = new Journey();

    // Act
    journey.enableFor(app);

    // Assert – two engines should have been created and mounted
    expect(wizardEngineCtorMock).toHaveBeenCalledTimes(2);
    expect(app.use).toHaveBeenCalledTimes(2);
    expect(app.use).toHaveBeenCalledWith('/example1', 'router-example1');
    expect(app.use).toHaveBeenCalledWith('/example2', 'router-example2');
  });

  it('logs and rethrows an error if a journey fails to initialise', () => {
    const badFile = path.join('/tmp', 'broken', 'index.ts');
    globSyncMock.mockReturnValue([badFile]);

    createVirtualJourneyModule(badFile);

    const initError = new Error('initialisation failed');
    wizardEngineCtorMock.mockImplementation(() => {
      throw initError;
    });

    const app = { use: jest.fn() };
    const journey = new Journey();

    // Act & Assert – enableFor should propagate the failure
    expect(() => journey.enableFor(app)).toThrow(initError);
    expect(loggerInstance.error).toHaveBeenCalledWith(`Failed to load journey from ${badFile}:`, initError);
  });
});
