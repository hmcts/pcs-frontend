import { type Session, type SessionData } from 'express-session';
import { type TokenEndpointResponse, type UserInfoResponse } from 'openid-client';
import { type Redis } from 'ioredis';
import { type Environment } from 'nunjucks';
import { type CcdCase } from '../main/interfaces/ccdCase.interface';
import { S2S } from '../main/modules/s2s';

export interface UserInfoResponseWithToken extends UserInfoResponse {
  accessToken: string;
  idToken: string;
  refreshToken: string;
}

interface CustomSessionData extends SessionData {
  codeVerifier?: string;
  nonce?: string;
  user?: UserInfoResponseWithToken;
  returnTo?: string;
  formData?: Record<string, any>;
  ccdCase?: CcdCase;
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
      nunjucksEnv?: Environment;
      redisClient?: Redis;
      shutdown?: boolean;
      ENV?: string;
      s2s?: S2S;
    };
  }
}

export {};
