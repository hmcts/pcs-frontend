import * as LDClient from '@launchdarkly/node-server-sdk';
import { Request } from 'express';

import { FieldConfig, StepConfig } from './schema';

export class FeatureFlags {
  /**
   * Remove any fields (and optionally whole steps) that are behind a LaunchDarkly flag which evaluates to false.
   * The original step config coming from the cached journey MUST NOT be mutated because it is shared
   * between requests. We therefore create a shallow copy with a new `fields` object when filtering.
   */
  static async applyLaunchDarklyFlags(original: StepConfig, req: Request, slug: string): Promise<StepConfig> {
    const ldClient = (req.app?.locals?.launchDarklyClient as LDClient.LDClient | undefined) ?? undefined;

    // If LaunchDarkly is not initialised just return the original config
    if (!ldClient) {
      return original;
    }

    // Helper to evaluate a flag. If `flagKey` is undefined we treat the element as enabled
    // but still allow LaunchDarkly to override by convention-based flag keys.
    const isEnabled = async (explicitKey: string | undefined, fallbackKey: string): Promise<boolean> => {
      const keyToCheck = explicitKey ?? fallbackKey;

      // If *both* explicit and derived keys are empty – which shouldn't happen – enable by default.
      if (!keyToCheck) {
        return true;
      }

      try {
        const context: LDClient.LDContext = {
          kind: 'user',
          key: (req.session?.user?.uid as string) ?? 'anonymous',
          name: req.session?.user?.name ?? 'anonymous',
          email: req.session?.user?.email ?? 'anonymous',
          firstName: req.session?.user?.given_name ?? 'anonymous',
          lastName: req.session?.user?.family_name ?? 'anonymous',
          custom: {
            roles: req.session?.user?.roles ?? [],
          },
        };

        // If the flag does not exist LD will return the default (true) so UI remains visible by default.
        return await ldClient.variation(keyToCheck, context, true);
      } catch {
        // Logging should be done by caller if needed
        return true;
      }
    };

    const stepDefaultKey = `${slug}-${original.id}`;

    // If the whole step is disabled hide it entirely (return empty fields)
    if (!(await isEnabled(original.flag, stepDefaultKey))) {
      return { ...original, fields: {} } as StepConfig;
    }

    if (!original.fields || Object.keys(original.fields).length === 0) {
      return original;
    }

    const newFields: Record<string, FieldConfig> = {};
    for (const [name, config] of Object.entries(original.fields)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cfg: any = config;
      const fieldDefaultKey = `${slug}-${original.id}-${name}`;
      const isEnabledFlag = await isEnabled(cfg.flag, fieldDefaultKey);
      if (isEnabledFlag) {
        newFields[name] = config as FieldConfig;
      }
    }

    // If nothing changed return original reference to avoid unnecessary allocations
    if (Object.keys(newFields).length === Object.keys(original.fields).length) {
      return original;
    }

    return { ...original, fields: newFields } as StepConfig;
  }

  static async applyLdOverride(step: StepConfig, req: Request, slug: string): Promise<StepConfig> {
    const ld = req.app.locals.launchDarklyClient as LDClient.LDClient | undefined;
    if (!ld) {
      return step;
    }

    const ctx: LDClient.LDContext = { kind: 'user', key: (req.session?.user?.uid as string) ?? 'anon' };
    const flagKey = `${slug}-${step.id}-override`;
    const patch = await ld.variation(flagKey, ctx, null);

    if (!patch) {
      return step;
    }

    // start with a shallow copy so we never mutate the cached journey
    const merged: StepConfig = { ...step, ...patch } as StepConfig;

    // Remove keys whose override value is null
    const pruneNulls = (obj: Record<string, unknown>) => {
      for (const k of Object.keys(obj)) {
        if (obj[k] === null) {
          delete obj[k];
        } else if (typeof obj[k] === 'object') {
          pruneNulls(obj[k] as Record<string, unknown>);
        }
      }
    };
    pruneNulls(merged);

    // optional: validate merged with Zod again

    return merged as StepConfig;
  }
}
