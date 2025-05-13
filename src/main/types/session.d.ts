import 'express-session';

declare module 'express-session' {
  interface SessionData {
    formData?: Record<string, any>;
    isLoggedIn?: boolean;
  }
}
