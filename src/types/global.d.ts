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

// Document structure for CDAM uploads
export interface DocumentManagementFile {
  classification?: string;
  size?: number;
  mimeType?: string;
  originalDocumentName?: string;
  hashToken?: string;
  createdOn?: string;
  createdBy?: string;
  lastModifiedBy?: string;
  modifiedOn?: string;
  ttl?: string;
  metadata?: {
    case_type_id?: string;
    jurisdiction?: string;
  };
  _links?: {
    self?: {
      href?: string;
    };
    binary?: {
      href?: string;
    };
  };
  [key: string]: any; // Allow additional fields from CDAM
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
  postcodeLookupResult?: any[];
  lookupPostcode?: string;
  lookupError?: { field: string; text: string };
  _addressLookup?: AddressLookupSessionData;
  uploadedDocuments?: DocumentManagementFile[];
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
