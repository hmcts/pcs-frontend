import fs from 'fs';
import path from 'path';

import { Logger } from '@hmcts/nodejs-logging';
import * as LDClient from '@launchdarkly/node-server-sdk';
import express, { NextFunction, Request, Response, Router } from 'express';

import { oidcMiddleware } from '../../../middleware/oidc';

import { FieldConfig, JourneyConfig, JourneySchema, StepConfig } from './schema';
import { type JourneyStore } from './storage/index';
import { JourneyValidator } from './validation';

// Extend Express Request interface
interface RequestWithStep extends Request {
  step?: StepConfig;
}

// Simplified journey context
interface JourneyContext {
  caseId: string;
  step: StepConfig;
  data: Record<string, unknown>;
  allData: Record<string, unknown>;
  errors?: Record<string, string | { day?: string; month?: string; year?: string; message: string }>;
  previousStepUrl?: string | null;
  summaryRows?: SummaryRow[];
}

interface SummaryRow {
  key: { text: string };
  value: { text: string; html?: string };
  actions?: {
    items: {
      href: string;
      text: string;
      visuallyHiddenText: string;
    }[];
  };
}

export class WizardEngine {
  public readonly journey: JourneyConfig;
  public readonly slug: string;
  public readonly basePath: string;
  private readonly validator: JourneyValidator;
  private static validatedJourneys: Map<string, JourneyConfig> = new Map();
  private readonly store!: JourneyStore;

  logger = Logger.getLogger('WizardEngine');

  constructor(
    filePath: string,
    slug: string
  ) {

    let storeType;

    // Check if we already have a validated journey for this slug
    const cachedJourney = WizardEngine.validatedJourneys.get(slug);
    if (cachedJourney) {
      this.journey = cachedJourney;
      this.slug = slug;
      this.basePath = `/${slug}`;
      this.validator = new JourneyValidator();
      // Initialise the store based on cached journey config
      storeType = this.journey.config?.store?.type ?? 'session';
      this.store = this.setStore(storeType);
      return;
    }

    // If not cached, load and validate the journey
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Validate and parse the journey JSON using Zod
    const parseResult = JourneySchema.safeParse(raw);
    if (!parseResult.success) {
      this.logger.error(
        'Invalid journey configuration:',
        parseResult.error.issues,
        `${filePath}: ${parseResult.error.issues[0]?.message}`
      );
      throw new Error(`Invalid journey configuration in ${filePath}: ${parseResult.error.issues[0]?.message}`);
    }

    // Store the validated journey in the static cache
    WizardEngine.validatedJourneys.set(slug, parseResult.data);

    this.journey = parseResult.data;
    this.slug = slug;
    this.basePath = `/${slug}`;
    this.validator = new JourneyValidator();
    storeType = this.journey.config?.store?.type ?? 'session';
    this.store = this.setStore(storeType);
  }

  private setStore(storeType: string) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const storeModule = require(`./storage/${storeType}Store`);
    const factoryName = `${storeType}Store`;
    const storeFactory = (storeModule[factoryName] ?? storeModule.default) as (slug: string) => JourneyStore;
    if (!storeFactory) {
      throw new Error(`Store implementation for type "${this.journey.config?.store?.type}" not found`);
    }
    return storeFactory(this.slug);
  }

  // Simplified next step resolution
  private resolveNext(step: StepConfig, allData: Record<string, unknown>): string {
    const nxt = step.next;
    if (!nxt) {
      return step.id;
    }
    if (typeof nxt === 'string') {
      return nxt;
    }

    const stepData = allData[step.id] as Record<string, unknown>;
    if (!stepData) {
      return nxt.else || step.id;
    }

    // Handle simple equality checks like "age == 'yes'"
    const equalityMatch = nxt.when.match(/(\w+)\s*==\s*['"]([^'"]+)['"]/);
    if (equalityMatch) {
      const [, fieldName, expectedValue] = equalityMatch;
      const actualValue = stepData[fieldName];
      return actualValue === expectedValue ? nxt.goto : nxt.else || step.id;
    }

    // Handle array length checks like "grounds.length >= 1"
    const lengthMatch = nxt.when.match(/(\w+)\.length\s*>=\s*(\d+)/);
    if (lengthMatch) {
      const [, fieldName, minLength] = lengthMatch;
      const fieldValue = stepData[fieldName];
      const length = Array.isArray(fieldValue) ? fieldValue.length : 0;
      return length >= parseInt(minLength) ? nxt.goto : nxt.else || step.id;
    }

    return nxt.else || step.id;
  }

  private async resolveTemplatePath(stepId: string): Promise<string> {
    const step = this.journey.steps[stepId];
    if (!step) {
      return stepId;
    }

    // Use custom template if specified
    if (step.template) {
      return step.template;
    }

    // Try journey-specific template first
    const regularPath = path.join(this.slug, stepId);
    try {
      const viewsDir = path.join(__dirname, '..', '..', '..', 'views');
      const journeyTemplatePath = path.join(viewsDir, `${regularPath}.njk`);
      await fs.promises.access(journeyTemplatePath);
      return regularPath;
    } catch {
      // If no journey-specific template found, use default templates
      if (step.type && ['summary', 'confirmation', 'ineligible', 'error', 'complete', 'success'].includes(step.type)) {
        return `_defaults/${step.type}`;
      }
      // For regular steps with fields, use generic form template
      if (step.fields && Object.keys(step.fields).length > 0) {
        return '_defaults/form';
      }
      // If no specific template or default found, fall back to regular path
      return regularPath;
    }
  }

  // Build summary rows for summary pages
  private buildSummaryRows(allData: Record<string, unknown>): SummaryRow[] {
    return Object.entries(this.journey.steps)
      .filter(([stepId, stepConfig]) => {
        const typedStepConfig = stepConfig as StepConfig;
        // Skip summary and confirmation steps
        if (typedStepConfig.type === 'summary' || typedStepConfig.type === 'confirmation') {
          return false;
        }
        // Skip steps without fields
        if (!typedStepConfig.fields || Object.keys(typedStepConfig.fields).length === 0) {
          return false;
        }
        // Skip steps without data
        const stepData = allData[stepId] as Record<string, unknown>;
        return stepData && Object.keys(stepData).length > 0;
      })
      .map(([stepId, stepConfig]) => {
        const typedStepConfig = stepConfig as StepConfig;
        const stepData = allData[stepId] as Record<string, unknown>;
        const fieldValues = Object.entries(typedStepConfig.fields!)
          .filter(([fieldName]) => stepData[fieldName])
          .map(([fieldName, fieldConfig]) => {
            const typedFieldConfig = fieldConfig as FieldConfig;
            const value = stepData[fieldName];
            if (
              typedFieldConfig.type === 'date' &&
              value &&
              typeof value === 'object' &&
              'day' in value &&
              'month' in value &&
              'year' in value
            ) {
              return `${value.day || ''}/${value.month || ''}/${value.year || ''}`;
            }
            return Array.isArray(value) ? value.join(', ') : String(value);
          });

        return {
          key: { text: typedStepConfig.title || stepId },
          value: { text: fieldValues.join(', ') },
          actions: {
            items: [
              {
                href: `${this.basePath}/${stepId}`,
                text: 'Change',
                visuallyHiddenText: `change ${(typedStepConfig.title || stepId).toLowerCase()}`,
              },
            ],
          },
        };
      });
  }

  // Find the previous step for back navigation by analyzing journey flow
  private findPreviousStep(currentStepId: string, allData: Record<string, unknown>): string | null {
    // Find which step(s) can lead to the current step
    for (const [stepId, stepConfig] of Object.entries(this.journey.steps)) {
      const typedStepConfig = stepConfig as StepConfig;
      const next = typedStepConfig.next;

      if (!next) {
        continue;
      }

      // Direct next step
      if (typeof next === 'string' && next === currentStepId) {
        return stepId;
      }

      // Conditional next step
      if (typeof next === 'object') {
        const stepData = allData[stepId] as Record<string, unknown>;
        if (!stepData) {
          continue;
        }

        // Handle simple equality checks like "age == 'yes'"
        const equalityMatch = next.when.match(/(\w+)\s*==\s*['"]([^'"]+)['"]/);
        if (equalityMatch) {
          const [, fieldName, expectedValue] = equalityMatch;
          const actualValue = stepData[fieldName];

          // Check if this step's goto leads to current step
          if (next.goto === currentStepId && actualValue === expectedValue) {
            return stepId;
          }

          // Check if this step's else leads to current step
          if (next.else === currentStepId && actualValue !== expectedValue) {
            return stepId;
          }
        }

        // Handle array length checks like "grounds.length >= 1"
        const lengthMatch = next.when.match(/(\w+)\.length\s*>=\s*(\d+)/);
        if (lengthMatch) {
          const [, fieldName, minLength] = lengthMatch;
          const fieldValue = stepData[fieldName];
          const length = Array.isArray(fieldValue) ? fieldValue.length : 0;
          const meetsLength = length >= parseInt(minLength);

          // Check if this step's goto leads to current step
          if (next.goto === currentStepId && meetsLength) {
            return stepId;
          }

          // Check if this step's else leads to current step
          if (next.else === currentStepId && !meetsLength) {
            return stepId;
          }
        }
      }
    }

    return null;
  }

  private buildJourneyContext(
    step: StepConfig,
    caseId: string,
    allData: Record<string, unknown>,
    errors?: Record<string, string | { day?: string; month?: string; year?: string; message: string }>
  ): JourneyContext & { dateItems?: Record<string, { name: string; classes: string; value: string }[]> } {
    const previousStepUrl = this.findPreviousStep(step.id, allData);
    const summaryRows = step.type === 'summary' ? this.buildSummaryRows(allData) : undefined;
    const data = (allData[step.id] as Record<string, unknown>) || {};

    // Build dateItems for all date fields
    const dateItems: Record<string, { name: string; classes: string; value: string }[]> = {};
    if (step.fields) {
      for (const [fieldName, fieldConfig] of Object.entries(step.fields)) {
        const typedFieldConfig = fieldConfig as FieldConfig;
        if (typedFieldConfig.type === 'date') {
          const fieldValue = data[fieldName] as Record<'day' | 'month' | 'year', string | undefined>;
          const fieldError = errors && errors[fieldName];
          dateItems[fieldName] = (['day', 'month', 'year'] as ('day' | 'month' | 'year')[]).map(part => {
            let hasError = false;
            if (fieldError) {
              if (typeof fieldError === 'object' && fieldError[part]) {
                hasError = true;
              } else if (typeof fieldError === 'string' && fieldError.includes(part)) {
                hasError = true;
              }
            }
            return {
              name: part,
              classes:
                (part === 'day'
                  ? 'govuk-input--width-2'
                  : part === 'month'
                    ? 'govuk-input--width-2'
                    : 'govuk-input--width-4') + (hasError ? ' govuk-input--error' : ''),
              value: fieldValue?.[part] || '',
            };
          });
        }
      }
    }

    return {
      caseId,
      step,
      data,
      allData,
      errors,
      previousStepUrl,
      summaryRows,
      ...(Object.keys(dateItems).length > 0 ? { dateItems } : {}),
    };
  }

  // Check if a step is accessible based on journey progress
  private isStepAccessible(stepId: string, allData: Record<string, unknown>): boolean {
    // Always allow access to the first step
    const firstStepId = Object.keys(this.journey.steps)[0];
    if (stepId === firstStepId) {
      return true;
    }

    // If journey is complete (has confirmation data), only allow access to confirmation
    if (allData.confirmation) {
      return stepId === 'confirmation';
    }

    // Build a map of step dependencies
    const stepDependencies = new Map<string, Set<string>>();
    for (const [id, step] of Object.entries(this.journey.steps)) {
      const typedStep = step as StepConfig;
      if (!typedStep.next) {
        continue;
      }

      const addDependency = (nextStep: string) => {
        if (!stepDependencies.has(nextStep)) {
          stepDependencies.set(nextStep, new Set());
        }
        stepDependencies.get(nextStep)!.add(id);
      };

      if (typeof typedStep.next === 'string') {
        addDependency(typedStep.next);
      } else {
        addDependency(typedStep.next.goto);
        if (typedStep.next.else) {
          addDependency(typedStep.next.else);
        }
      }
    }

    // Check if all required previous steps are completed
    const visited = new Set<string>();
    const toVisit = new Set<string>([stepId]);

    while (toVisit.size > 0) {
      const currentStep = Array.from(toVisit)[0];
      toVisit.delete(currentStep);
      visited.add(currentStep);

      const dependencies = stepDependencies.get(currentStep) || new Set();
      for (const dependency of dependencies) {
        if (visited.has(dependency)) {
          continue;
        }

        const dependencyStep = this.journey.steps[dependency] as StepConfig;
        if (!dependencyStep.fields || Object.keys(dependencyStep.fields).length === 0) {
          continue;
        }

        const dependencyData = allData[dependency] as Record<string, unknown>;
        if (!dependencyData || Object.keys(dependencyData).length === 0) {
          return false;
        }

        toVisit.add(dependency);
      }
    }

    return true;
  }

  /**
   * Remove any fields (and optionally whole steps) that are behind a LaunchDarkly flag which evaluates to false.
   * The original step config coming from the cached journey MUST NOT be mutated because it is shared
   * between requests. We therefore create a shallow copy with a new `fields` object when filtering.
   */
  private async applyLaunchDarklyFlags(original: StepConfig, req: Request): Promise<StepConfig> {
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

        this.logger.info('ISENABLED ===>> LaunchDarkly Flag Evaluation', { context, keyToCheck });

        const flags = await ldClient.allFlagsState(context);
        this.logger.info('FLAGS ===>> LaunchDarkly ALLLLL Flag Evaluation', flags.allValues(), flags.toJSON());

        // If the flag does not exist LD will return the default (true) so UI remains visible by default.
        return await ldClient.variation(keyToCheck, context, true);
      } catch (err) {
        this.logger.warn('LaunchDarkly evaluation failed', err);
        return true;
      }
    };

    const stepDefaultKey = `${this.slug}-${original.id}`;

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
      const fieldDefaultKey = `${this.slug}-${original.id}-${name}`;
      const isEnabledFlag = await isEnabled(cfg.flag, fieldDefaultKey);
      this.logger.info('IN LOOP ===>>LaunchDarkly Flag Evaluation', { fieldDefaultKey, isEnabledFlag });
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

  private async getPreviousVisibleStep(
    currentStepId: string,
    req: Request,
    allData: Record<string, unknown>
  ): Promise<string | null> {
    let prevId = this.findPreviousStep(currentStepId, allData);
    while (prevId) {
      let prevStep = { id: prevId, ...this.journey.steps[prevId] } as StepConfig;
      prevStep = await this.applyLaunchDarklyFlags(prevStep, req);

      const firstStepId = Object.keys(this.journey.steps)[0];
      const hasVisibleFields = prevStep.fields ? Object.keys(prevStep.fields).length > 0 : false;
      this.logger.info('Checking prev step visibility', { prevId, fields: prevStep.fields, hasVisibleFields });

      if (prevId === firstStepId || hasVisibleFields) {
        return prevId;
      }

      prevId = this.findPreviousStep(prevId, allData);
    }
    return null;
  }

  private async applyLdOverride(step: StepConfig, req: Request): Promise<StepConfig> {
    const ld = req.app.locals.launchDarklyClient as LDClient.LDClient | undefined;
    if (!ld) {
      return step;
    }

    const ctx: LDClient.LDContext = { kind: 'user', key: (req.session?.user?.uid as string) ?? 'anon' };
    const flagKey = `${this.slug}-${step.id}-override`;
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

  router(): Router {
    const router = Router();

    router.use((req, res, next) => {
      res.locals.journey = this.journey;
      res.locals.slug = this.slug;
      next();
    });

    // Apply authentication middleware if required
    if (this.journey.config?.auth?.required !== false) {
      router.use(oidcMiddleware);
    }

    // Helper to retrieve or generate a caseId stored in the session so it never appears in the URL
    const getOrCreateCaseId = (req: Request): string => {
      const session = req.session as unknown as Record<string, unknown>;
      const key = `journey_${this.slug}_caseId`;
      let caseId = session?.[key] as string | undefined;
      if (!caseId) {
        // Generate a new case ID using timestamp and random string (same format as before)
        caseId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        if (session) {
          session[key] = caseId;
        }
      }
      return caseId;
    };

    // Add route to start a new journey (creates caseId in the session and redirects to first step)
    router.get('/', (req, res) => {
      getOrCreateCaseId(req);
      res.redirect(`${this.basePath}/${Object.keys(this.journey.steps)[0]}`);
    });

    router.param('step', (req: Request, res: Response, next: NextFunction, stepId: string) => {
      const step = this.journey.steps[stepId];
      if (!step) {
        return res.status(404).render('not-found');
      }
      (req as RequestWithStep).step = { id: stepId, ...step };
      next();
    });

    // ─── GET ───
    router.get('/:step', async (req, res, next) => {
      const caseId = getOrCreateCaseId(req);
      let step = (req as RequestWithStep).step!;
      step = await this.applyLdOverride(step, req);
      step = await this.applyLaunchDarklyFlags(step, req);

      this.logger.info('LaunchDarkly Flag Evaluation', { step });

      try {
        const { data } = await this.store.load(req, caseId);

        // Auto-skip only if the original step had fields but all of them are now hidden
        const originalFields = this.journey.steps[step.id]?.fields;
        const originallyHadFields = originalFields && Object.keys(originalFields).length > 0;
        const nowHasNoFields = !step.fields || Object.keys(step.fields).length === 0;

        if (originallyHadFields && nowHasNoFields) {
          const nextId = this.resolveNext(step, data);
          if (nextId && nextId !== step.id) {
            return res.redirect(`${this.basePath}/${nextId}`);
          }
        }

        // Check if the requested step is accessible based on journey progress
        if (!this.isStepAccessible(step.id, data)) {
          // Find the first incomplete step
          const stepIds = Object.keys(this.journey.steps);
          let firstIncompleteStep = stepIds[0];

          for (const stepId of stepIds) {
            const stepConfig = this.journey.steps[stepId] as StepConfig;
            // Skip steps without fields
            if (!stepConfig.fields || Object.keys(stepConfig.fields).length === 0) {
              continue;
            }
            // If this step has no data, it's the first incomplete step
            if (!data[stepId] || Object.keys(data[stepId] as Record<string, unknown>).length === 0) {
              firstIncompleteStep = stepId;
              break;
            }
          }

          // Redirect to the first incomplete step
          return res.redirect(`${this.basePath}/${firstIncompleteStep}`);
        }

        let context = this.buildJourneyContext(step, caseId, data);

        // Re-calculate previousStepUrl to skip hidden steps
        const prevVisible = await this.getPreviousVisibleStep(step.id, req, data);
        context = {
          ...context,
          previousStepUrl: prevVisible ? `${this.basePath}/${prevVisible}` : null,
        };

        this.logger.info('previousStepUrl sent to template', context.previousStepUrl);

        res.render(await this.resolveTemplatePath(step.id), {
          ...context,
          data: context.data,
          errors: null,
          allData: context.allData,
          step: context.step,
          previousStepUrl: context.previousStepUrl,
          summaryRows: context.summaryRows,
        });
      } catch (err) {
        next(err);
      }
    });

    // ─── POST ───
    router.post('/:step', express.urlencoded({ extended: true }), async (req, res, next) => {
      const caseId = getOrCreateCaseId(req);
      let step = (req as RequestWithStep).step!;
      step = await this.applyLdOverride(step, req);
      step = await this.applyLaunchDarklyFlags(step, req);

      // We don't skip steps during POST; validation will pass for visible fields

      // Validate using Zod-based validation
      const validationResult = this.validator.validate(step, req.body);

      if (!validationResult.success) {
        const { data } = await this.store.load(req, caseId);
        // Reconstruct nested date fields from req.body for template
        const reconstructedData = { ...req.body };
        if (step.fields) {
          for (const [fieldName, fieldConfig] of Object.entries(step.fields)) {
            const typedFieldConfig = fieldConfig as FieldConfig;
            if (typedFieldConfig.type === 'date') {
              reconstructedData[fieldName] = {
                day: req.body[`${fieldName}-day`] || '',
                month: req.body[`${fieldName}-month`] || '',
                year: req.body[`${fieldName}-year`] || '',
              };
            }
          }
        }
        // Patch the current step's data with reconstructedData for this render
        const patchedAllData = { ...data, [step.id]: reconstructedData };
        let context = this.buildJourneyContext(step, caseId, patchedAllData, validationResult.errors);
        const prevVisible = await this.getPreviousVisibleStep(step.id, req, patchedAllData);
        context = {
          ...context,
          previousStepUrl: prevVisible ? `${this.basePath}/${prevVisible}` : null,
        };

        this.logger.info('previousStepUrl sent to template', context.previousStepUrl);

        return res.status(400).render(await this.resolveTemplatePath(step.id), {
          ...context,
          errors: validationResult.errors,
        });
      }

      try {
        const { version } = await this.store.load(req, caseId);
        const { data: merged } = await this.store.save(req, caseId, version, {
          [step.id]: validationResult.data || {},
        });

        const nextId = this.resolveNext(step, merged);
        const nextStep = this.journey.steps[nextId];

        // If transitioning to a confirmation step, generate reference number
        if (nextStep?.type === 'confirmation' && nextStep.data?.referenceNumber) {
          const referenceNumber = await this.store.generateReference(req, this.slug, caseId);

          // Save the generated reference to the confirmation step data
          await this.store.save(req, caseId, version + 1, {
            [nextId]: { referenceNumber },
          });
        }

        res.redirect(`${this.basePath}/${nextId}`);
      } catch (err) {
        next(err);
      }
    });

    return router;
  }
}
