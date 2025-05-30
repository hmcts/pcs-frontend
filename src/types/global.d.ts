import { type Session, type SessionData } from 'express-session';
import { type TokenEndpointResponse, type UserInfoResponse } from 'openid-client';
import { type Redis } from 'ioredis';
import { type Environment } from 'nunjucks';
import { S2S } from '../main/modules/s2s';

interface UserInfoResponseWithToken extends UserInfoResponse {
  accessToken: string;
  idToken: string;
  refreshToken: string;
}

export interface CcdCaseData {
  applicantForename: string;
  applicantSurname: string;
  applicantAddress: {
    AddressLine1: string;
    AddressLine2: string;
    AddressLine3: string;
    PostTown: string;
    County: string;
    PostCode: string;
    Country: string;
  };
}


export interface CcdCase {
  id: string;
  data: CcdCaseData;
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
