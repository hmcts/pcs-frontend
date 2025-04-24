import { Session, SessionData } from 'express-session';
import { TokenEndpointResponse, UserInfoResponse } from 'openid-client';

interface UserInfoResponseWithToken extends UserInfoResponse {
  accessToken: string;
  idToken: string;
  refreshToken: string;
}

interface CustomSessionData extends SessionData {
  codeVerifier?: string;
  nonce?: string;
  state?: string;
  user?: UserInfoResponseWithToken;
  serviceToken?: string;
  destroy(callback: (err?: Error) => void): void;
}

declare module 'express-session' {
  interface SessionData extends CustomSessionData {}
}

declare module 'express' {
  interface Request {
    session: Session & CustomSessionData;
  }
}

export {};
