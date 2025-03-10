module.exports = {
  roots: ['<rootDir>/src/test/contact/consumer'],
  testRegex: '(/src/test/contact/consumer/*|\\.test)\\.(ts|js)$',
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
};
