import type { Request } from 'express';

import type { JourneyFlowConfig, JourneyFlowConfigResolver } from '@modules/steps/stepFlow.interface';

export type FormBuilderFlowConfig = JourneyFlowConfig | JourneyFlowConfigResolver;

export async function resolveFormBuilderFlowConfig(
  req: Request,
  flowConfigOrResolver: FormBuilderFlowConfig
): Promise<JourneyFlowConfig> {
  if (typeof flowConfigOrResolver === 'function') {
    return flowConfigOrResolver(req);
  }

  return flowConfigOrResolver;
}

export function getStaticBasePath(flowConfigOrResolver: FormBuilderFlowConfig, fallbackBasePath: string): string {
  if (typeof flowConfigOrResolver === 'function') {
    return fallbackBasePath;
  }

  return flowConfigOrResolver.basePath || fallbackBasePath;
}
