import { type Session, type SessionData } from 'express-session';
import { type TokenEndpointResponse, type UserInfoResponse } from 'openid-client';
import { type Redis } from 'ioredis';
import { type Environment } from 'nunjucks';
import { type CcdCase } from '../main/interfaces/ccdCase.interface';
import { S2S } from '../main/modules/s2s';
import { type i18n, type TFunction } from 'i18next';

export interface UserInfoResponseWithToken extends UserInfoResponse {
  accessToken: string;
  idToken: string;
  refreshToken: string;
}

export interface AddressLookupSessionData {
  [stepId: string]: {
    [fieldNamePrefix: string]: {
      postcode?: string;
      addresses?: any[];
    };
  };
}

interface CustomSessionData extends SessionData {
  codeVerifier?: string;
  nonce?: string;
  user?: UserInfoResponseWithToken;
  returnTo?: string;
  formData?: Record<string, any>;
  ccdCase?: CcdCase;
  caseReference?: string;
  postcodeLookupResult?: any[];
  lookupPostcode?: string;
  lookupError?: { field: string; text: string };
  _addressLookup?: AddressLookupSessionData;
  //TODO: currently served from LaunchDarkly flag - remove this once CCD case is implemented
  defendantName?: string;
  destroy(callback: (err?: Error) => void): void;
}

declare module 'express-session' {
  interface SessionData extends CustomSessionData {}
}

declare module 'express' {
  interface Request {
    session: Session & CustomSessionData;
    i18n?: i18n;
    t?: TFunction;
    language: string;
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
