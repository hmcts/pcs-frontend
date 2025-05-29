import { Request } from 'express';

export interface JourneyStore {
  /** Load the latest data and version for this caseId */
  load(req: Request, caseId: number): Promise<{ data: Record<string, unknown>; version: number }>;

  /** Merge in `patch` and persist; return new data & version */
  save(
    req: Request,
    caseId: number,
    version: number,
    patch: Record<string, unknown>
  ): Promise<{ data: Record<string, unknown>; version: number }>;
}
