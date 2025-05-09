import 'express-session';

declare module 'express-session' {
  interface SessionData {
    formData?: Record<string, any>;
    completedSteps?: string[];
  }
}
