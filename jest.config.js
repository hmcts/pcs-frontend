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
    '^interfaces/(.*)$': '<rootDir>/src/main/interfaces/$1',
    '^jose$': '<rootDir>/src/test/unit/modules/s2s/__mocks__/jose.ts',
  },
  testPathIgnorePatterns: ['/__mocks__/'],
  coverageProvider: 'v8',
  transformIgnorePatterns: ['node_modules/(?!(jose|@panva|oidc-token-hash)/)'],
};
