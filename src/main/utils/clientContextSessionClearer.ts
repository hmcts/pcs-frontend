import { Request } from 'express';

export const clientContextSessionClearer = (req: Request): void => {
  delete req.session.clientContext;
};
