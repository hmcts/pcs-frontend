import { type Session, type SessionData } from 'express-session';
import { type UserInfoResponse } from 'openid-client';
import { type Redis } from 'ioredis';
import { type Environment } from 'nunjucks';
import { type CcdCase } from '@services/ccdCase.interface';
import { S2S } from '../main/modules/s2s';
import { OIDCModule } from '../main/modules/oidc';
import { type TFunction } from 'i18next';
import { type CcdCaseModel } from '@services/ccdCaseData.model';

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
  returnTo?: string;
}

declare module 'express-session' {
  interface SessionData extends CustomSessionData {}
}

declare module 'express' {
  interface Request {
    session: Session & CustomSessionData;
    language: string;
    res?: Response;
  }

  interface Response {
    locals: {
      validatedCase?: CcdCaseModel;
      t?: TFunction;
      lang?: string;
    } & Record<string, unknown>;
    csrfToken?: () => string;
  }

  interface Application {
    locals: {
      nunjucksEnv?: Environment;
      redisClient?: Redis;
      shutdown?: boolean;
      ENV?: string;
      s2s?: S2S;
      oidc?: OIDCModule;
    };
  }
}

export {};
