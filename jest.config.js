module.exports = {
  roots: ['<rootDir>/src/test/unit'],
  testRegex: '(/src/test/.*|\\.(test|spec))\\.(ts|js)$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts?$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
      useESM: false,
      isolatedModules: true,
    }],
  },
  coverageProvider: 'v8',
  moduleDirectories: ['node_modules', 'src'],
  moduleNameMapper: {
    '^openid-client$': '<rootDir>/src/test/unit/modules/oidc/__mocks__/openid-client.ts',
  },
  testPathIgnorePatterns: ['/__mocks__/'],
  preset: 'ts-jest',
  setupFiles: ['<rootDir>/.pnp.cjs'],
  resolver: 'jest-pnp-resolver',
  transformIgnorePatterns: ['node_modules/(?!(@hmcts)/)'],
};
