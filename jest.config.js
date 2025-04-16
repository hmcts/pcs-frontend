module.exports = {
  roots: ['<rootDir>/src/test/unit'],
  testRegex: '(/src/test/.*|\\.(test|spec))\\.(ts|js)$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts?$': 'ts-jest',
  },
  moduleNameMapper: {
    '^openid-client$': '<rootDir>/src/test/unit/modules/oidc/__mocks__/openid-client.ts',
  },
  testPathIgnorePatterns: ['/__mocks__/'],
  coverageProvider: 'v8',
};
