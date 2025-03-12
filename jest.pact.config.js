module.exports = {
  roots: ['<rootDir>/src/test/contract/consumer'],
  testRegex: '(/src/test/contract/consumer/*|\\.test)\\.(ts|js)$',
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
};
