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
    '^steps$': '<rootDir>/src/main/steps',
    '^app/(.*)$': '<rootDir>/src/main/app/$1',
  },
  testPathIgnorePatterns: ['/__mocks__/'],
  coverageProvider: 'v8',
};
