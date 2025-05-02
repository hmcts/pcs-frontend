import { type Session, type SessionData } from 'express-session';
import { type TokenEndpointResponse, type UserInfoResponse } from 'openid-client';
import { type Redis } from 'ioredis';

interface UserInfoResponseWithToken extends UserInfoResponse {
  accessToken: string;
  idToken: string | undefined;
  refreshToken: string | undefined;
}

interface CustomSessionData extends SessionData {
  codeVerifier?: string;
  nonce?: string;
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

  interface Application {
    locals: {
      redisClient?: Redis;
      shutdown?: boolean;
      ENV?: string;
    };
  }
}

export {};
