import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  roots: ['<rootDir>/src/test/contract/consumer'],
  testRegex: '(/src/test/contract/consumer/*|\\.test)\\.(ts|js)$',
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  transformIgnorePatterns: ['node_modules/(?!(https-proxy-agent|agent-base|@pact-foundation)/)'],
};

export default config;
