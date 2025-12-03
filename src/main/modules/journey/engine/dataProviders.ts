import type { Request as ExpressRequest } from 'express';
import type { Logger } from '@hmcts/nodejs-logging';

import { JourneyConfig, StepConfig } from './schema';

/**
 * Data provider function signature
 * Receives the request, current step, all journey data, and returns additional data to merge into context
 */
export type DataProvider = (
  req: ExpressRequest,
  step: StepConfig,
  allData: Record<string, unknown>,
  journey: JourneyConfig
) => Promise<Record<string, unknown>> | Record<string, unknown>;

/**
 * Configuration for data providers at journey or step level
 */
export interface DataProviderConfig {
  /**
   * Global data providers that run for all steps
   */
  global?: DataProvider[];
  /**
   * Step-specific data providers keyed by step ID
   */
  steps?: Record<string, DataProvider[]>;
}

export class DataProviderManager {
  private providers: DataProviderConfig;
  private logger: Logger;

  constructor(providers?: DataProviderConfig, logger?: Logger) {
    this.providers = providers || {};
    this.logger = logger || (require('@hmcts/nodejs-logging').Logger.getLogger('DataProviderManager'));
  }

  /**
   * Execute all relevant data providers and merge their results
   */
  async getDynamicData(
    req: ExpressRequest,
    step: StepConfig,
    allData: Record<string, unknown>,
    journey: JourneyConfig
  ): Promise<Record<string, unknown>> {
    const dynamicData: Record<string, unknown> = {};

    // Execute global providers first
    if (this.providers.global) {
      for (const provider of this.providers.global) {
        try {
          const data = await provider(req, step, allData, journey);
          Object.assign(dynamicData, data);
        } catch (err) {
          // Log error but don't fail the request
          this.logger.error('Error executing global data provider:', err);
        }
      }
    }

    // Execute step-specific providers
    if (this.providers.steps && this.providers.steps[step.id]) {
      for (const provider of this.providers.steps[step.id]) {
        try {
          const data = await provider(req, step, allData, journey);
          Object.assign(dynamicData, data);
        } catch (err) {
          // Log error but don't fail the request
          this.logger.error(`Error executing data provider for step ${step.id}:`, err);
        }
      }
    }

    return dynamicData;
  }
}

