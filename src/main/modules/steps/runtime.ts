import type { Request } from 'express';

import type { JourneyFlowConfig } from '../../interfaces/stepFlow.interface';

import { createStepNavigation, stepNavigation } from './flow';

export interface JourneyRuntimeContext {
  journeyName: string;
  profile?: string;
  flowConfig: JourneyFlowConfig;
  translationFolders?: string[];
}

export function getJourneyRuntimeContext(req: Request): JourneyRuntimeContext | undefined {
  return req.res?.locals?.journeyContext as JourneyRuntimeContext | undefined;
}

export function getActiveFlowConfig(req: Request, fallback?: JourneyFlowConfig): JourneyFlowConfig | undefined {
  return getJourneyRuntimeContext(req)?.flowConfig || fallback;
}

export function getActiveTranslationFolders(
  req: Request,
  fallbackFolder: string,
  fallbackFolders?: string[]
): string[] {
  const runtimeFolders = getJourneyRuntimeContext(req)?.translationFolders;
  if (runtimeFolders && runtimeFolders.length > 0) {
    return runtimeFolders;
  }

  if (fallbackFolders && fallbackFolders.length > 0) {
    return fallbackFolders;
  }

  return [fallbackFolder];
}

export function getActiveStepNavigation(req: Request, fallback?: JourneyFlowConfig) {
  const flowConfig = getActiveFlowConfig(req, fallback);
  return flowConfig ? createStepNavigation(flowConfig) : stepNavigation;
}
