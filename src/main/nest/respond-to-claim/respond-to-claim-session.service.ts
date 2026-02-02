import { Injectable } from '@nestjs/common';
import type { Request } from 'express';

export interface RespondToClaimSession {
  startNow?: Record<string, unknown>;
  postcodeFinder?: { postcode?: string };
  freeLegalAdvice?: Record<string, unknown>;
}

@Injectable()
export class RespondToClaimSessionService {
  getSessionData(req: Request): RespondToClaimSession {
    const session = req.session as unknown as Record<string, unknown>;
    return (session.respondToClaim as RespondToClaimSession) || {};
  }

  getStepData<K extends keyof RespondToClaimSession>(
    req: Request,
    step: K
  ): RespondToClaimSession[K] | undefined {
    return this.getSessionData(req)[step];
  }

  saveStepData<K extends keyof RespondToClaimSession>(
    req: Request,
    step: K,
    data: RespondToClaimSession[K]
  ): void {
    const session = req.session as unknown as Record<string, unknown>;
    if (!session.respondToClaim) {
      session.respondToClaim = {};
    }
    (session.respondToClaim as RespondToClaimSession)[step] = data;
  }

  clearSession(req: Request): void {
    const session = req.session as unknown as Record<string, unknown>;
    delete session.respondToClaim;
  }
}
