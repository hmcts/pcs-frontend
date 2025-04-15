export class Configuration {
  constructor(serverMetadata: any, clientId: string, clientSecret: string) {
    return {
      serverMetadata: () => serverMetadata,
    };
  }
}

export const randomPKCECodeVerifier = jest.fn();
export const randomNonce = jest.fn();
export const randomState = jest.fn();
export const calculatePKCECodeChallenge = jest.fn();
export const buildAuthorizationUrl = jest.fn();

export default {
  Configuration,
  randomPKCECodeVerifier,
  randomNonce,
  randomState,
  calculatePKCECodeChallenge,
  buildAuthorizationUrl,
}; 