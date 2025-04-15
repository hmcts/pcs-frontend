import { Session, SessionData } from 'express-session';
import { TokenSet } from 'openid-client';

interface CustomSessionData extends SessionData {
  codeVerifier?: string;
  nonce?: string;
  state?: string;
  tokens?: TokenSet;
  user?: any; // You can make this more specific based on your user type
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
