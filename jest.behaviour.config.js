// Behavioural tests: the real express slice, real templates and real client code in jsdom,
// with only external HTTP stubbed. Kept separate from jest.config.js because that config
// mocks jose, openid-client and glob, which these tests run for real.
module.exports = {
  roots: ['<rootDir>/src/test/behaviour'],
  testRegex: '\\.test\\.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  testEnvironment: 'jsdom',
  testEnvironmentOptions: { customExportConditions: ['node', 'require', 'default'] },
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: { allowJs: true, isolatedModules: true } }],
  },
  setupFiles: ['<rootDir>/src/test/behaviour/setup.ts'],
  moduleNameMapper: {
    '^@steps$': '<rootDir>/src/main/steps',
    '^@app/(.*)$': '<rootDir>/src/main/app/$1',
    '^@router/(.*)$': '<rootDir>/src/main/router/$1',
    '^@routes/(.*)$': '<rootDir>/src/main/routes/$1',
    '^@modules/(.*)$': '<rootDir>/src/main/modules/$1',
    '^@services/(.*)$': '<rootDir>/src/main/services/$1',
    '^@utils/(.*)$': '<rootDir>/src/main/utils/$1',
  },
  // These dependencies ship ESM only; compile them rather than mock them.
  transformIgnorePatterns: ['node_modules/(?!(jose|@hmcts-cft/docweave)/)'],
};
