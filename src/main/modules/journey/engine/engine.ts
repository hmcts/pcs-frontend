import fs from 'fs';
import path from 'path';

import { Logger } from '@hmcts/nodejs-logging';
import * as LDClient from '@launchdarkly/node-server-sdk';
import express, { NextFunction, Request, Response, Router } from 'express';

import { loadTranslations } from '../../../app/utils/loadTranslations';
import { oidcMiddleware } from '../../../middleware/oidc';
import { TTLCache } from '../../../utils/ttlCache';

import { processErrorsForTemplate } from './errorUtils';
import { FieldConfig, JourneyConfig, JourneyDraft, JourneySchema, StepConfig } from './schema';
import { type JourneyStore } from './storage/index';
import { JourneyValidator } from './validation';

// Extend Express Request interface
interface RequestWithStep extends Request {
  step?: StepConfig;
}

interface TranslatableOption {
  value?: string;
  text?: string;
  hint?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

// Simplified journey context
interface JourneyContext {
  caseId: string;
  step: StepConfig;
  data: Record<string, unknown>;
  allData: Record<string, unknown>;
  errors?: Record<string, { day?: string; month?: string; year?: string; message: string; anchor?: string }>;
  errorSummary?: { titleText: string; errorList: { text: string; href: string }[] } | null;
  previousStepUrl?: string | null;
  summaryRows?: SummaryRow[];
  language?: string;
  fields?: Record<string, unknown>;
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

  private static readonly TEMPLATE_CACHE_TTL_MS =
    process.env.NODE_ENV === 'development' ? 5000 : (undefined as number | undefined);
  private static readonly templatePathCache = new TTLCache<string, string>(WizardEngine.TEMPLATE_CACHE_TTL_MS);

  logger = Logger.getLogger('WizardEngine');

  constructor(journeyConfig: JourneyDraft, slug: string, sourcePath?: string) {
    // Disable caching when running unit tests so each instantiation can supply
    // its own journey configuration – tests often reuse the same slug with
    // different configs which would otherwise be ignored due to the cache.
    const cachingEnabled = process.env.NODE_ENV !== 'test';

    const cachedJourney = cachingEnabled ? WizardEngine.validatedJourneys.get(slug) : undefined;

    if (cachedJourney) {
      this.journey = cachedJourney;
    } else {
      // Validate the supplied TypeScript journey object
      const parseResult = JourneySchema.safeParse(journeyConfig);
      if (!parseResult.success) {
        const issue = parseResult.error.issues[0];
        const loc = issue.path.join('.') || '(root)';
        const fileInfo = sourcePath ? ` in file ${sourcePath}` : '';
        const detailedMsg = `Invalid journey configuration${fileInfo} (slug "${slug}", path "${loc}"): ${issue.message}`;
        this.logger.error(detailedMsg, parseResult.error.issues);
        throw new Error(detailedMsg);
      }

      this.journey = parseResult.data;

      // Only cache when enabled (i.e. not in test mode)
      if (cachingEnabled) {
        WizardEngine.validatedJourneys.set(slug, this.journey);
      }
    }

    this.slug = slug;
    this.basePath = `/${slug}`;
    this.validator = new JourneyValidator();
    const storeType = this.journey.config?.store?.type ?? 'session';
    this.store = this.setStore(storeType);
  }

  private setStore(storeType: string) {
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

    // If when is a function, evaluate it directly
    if (typeof nxt.when === 'function') {
      try {
        const conditionMet = (nxt.when as (sd: Record<string, unknown>, ad: Record<string, unknown>) => boolean)(
          stepData ?? {},
          allData ?? {}
        );
        return conditionMet ? nxt.goto : nxt.else || step.id;
      } catch (err) {
        this.logger.warn(`Error evaluating next.when() for step ${step.id}:`, err);
        return nxt.else || step.id;
      }
    }

    // If we reach here and when is not a function (or threw), default to else or stay
    return nxt.else || step.id;
  }

  private sanitizePathSegment(segment: string): string {
    return segment.replace(/[^a-zA-Z0-9_-]/g, '');
  }

  private async resolveTemplatePath(stepId: string): Promise<string> {
    const sanitizedStepId = this.sanitizePathSegment(stepId);
    const cacheKey = `${this.slug}:${sanitizedStepId}`;
    const cached = WizardEngine.templatePathCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const step = this.journey.steps[sanitizedStepId];
    if (!step) {
      return sanitizedStepId;
    }

    // Use explicit template if author provided one
    if (step.template) {
      const sanitizedTemplate = this.sanitizePathSegment(step.template);
      WizardEngine.templatePathCache.set(cacheKey, sanitizedTemplate);
      return sanitizedTemplate;
    }

    const checkExists = async (candidate: string): Promise<boolean> => {
      try {
        await fs.promises.access(candidate);
        return true;
      } catch {
        return false;
      }
    };

    // New DSL layout: journeys/<slug>/steps/<stepId>/<stepId>.njk (viewsDir may include journeys root)
    const newPath = path.join(this.slug, 'steps', sanitizedStepId, sanitizedStepId);
    const journeysRoot = path.join(__dirname, '..', '..', '..', 'journeys');
    const newTemplate = path.join(journeysRoot, `${newPath}.njk`);
    if (await checkExists(newTemplate)) {
      WizardEngine.templatePathCache.set(cacheKey, newPath);
      return newPath;
    }

    // If no journey-specific template found, use default templates
    if (step.type && ['summary', 'confirmation', 'ineligible', 'error', 'complete', 'success'].includes(step.type)) {
      const defaultPath = `_defaults/${step.type}`;
      WizardEngine.templatePathCache.set(cacheKey, defaultPath);
      return defaultPath;
    }
    // For regular steps with fields, use generic form template
    if (step.fields && Object.keys(step.fields).length > 0) {
      const formPath = '_defaults/form';
      WizardEngine.templatePathCache.set(cacheKey, formPath);
      return formPath;
    }
    // If no specific template or default found, fall back to regular path
    WizardEngine.templatePathCache.set(cacheKey, sanitizedStepId);
    return sanitizedStepId;
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

        // Determine label to use for the summary row. If any field within this step has
        // a legend marked `isPageHeading: true` prefer that legend text over the step
        // title. This allows authors to rely on the GOV.UK Design System convention of
        // promoting a fieldset legend to the page heading instead of duplicating the
        // text in the step title.
        let rowLabel: string = typedStepConfig.title || stepId;
        if (typedStepConfig.fields) {
          for (const fieldCfg of Object.values(typedStepConfig.fields)) {
            // fieldCfg.fieldset?.legend may be a string or an object. Only objects can
            // have the `isPageHeading` boolean flag so we narrow the type accordingly.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const legend = (fieldCfg as FieldConfig).fieldset?.legend as any;
            if (legend && typeof legend === 'object' && legend.isPageHeading) {
              rowLabel = legend.text ?? legend.html ?? rowLabel;
              break;
            }
          }
        }

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
            if (
              typedFieldConfig.type === 'checkboxes' ||
              typedFieldConfig.type === 'radios' ||
              typedFieldConfig.type === 'select'
            ) {
              // return the text of the options that are selected

              const items = typedFieldConfig.items ?? typedFieldConfig.options;
              const selected = items
                ?.filter(option => {
                  const optionValue = typeof option === 'string' ? option : option.value;
                  return (value as string[]).includes(optionValue) && optionValue !== '' && optionValue !== null;
                })
                .map(option => (typeof option === 'string' ? option : option.text))
                .join(', ');
              return selected ?? '';
            }
            return Array.isArray(value) ? value.join(', ') : String(value);
          });

        return {
          key: { text: rowLabel },
          value: { text: fieldValues.join(', ') },
          actions: {
            items: [
              {
                href: `${this.basePath}/${stepId}`,
                text: 'Change',
                visuallyHiddenText: `${rowLabel.toLowerCase()}`,
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

        // Handle functional conditions first
        if (typeof next.when === 'function') {
          const conditionMet = (next.when as (sd: Record<string, unknown>, ad: Record<string, unknown>) => boolean)(
            stepData ?? {},
            allData ?? {}
          );
          if (conditionMet && next.goto === currentStepId) {
            return stepId;
          }
          if (!conditionMet && next.else === currentStepId) {
            return stepId;
          }
        }

        // If next.when is not a function we cannot reliably determine previous; skip
      }
    }

    return null;
  }

  private buildJourneyContext(
    step: StepConfig,
    caseId: string,
    allData: Record<string, unknown>,
    errors?: Record<string, { day?: string; month?: string; year?: string; message: string; anchor?: string }>
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
              }
            }
            // Name stays as day/month/year – macro will apply the field prefix.
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

    // Preprocess fields for template rendering
    const processedFields: Record<string, FieldConfig> = {};
    if (step.fields) {
      for (const [fieldName, fieldConfig] of Object.entries(step.fields)) {
        const typedFieldConfig = fieldConfig as FieldConfig;

        // Clone to avoid mutating cached journey config
        const processed: FieldConfig = { ...typedFieldConfig } as FieldConfig;

        // Ensure id / name
        if (!processed.id) {
          processed.id = fieldName;
        }
        if (!processed.name) {
          processed.name = fieldName;
        }

        const fieldValue = data[fieldName] as unknown;
        const fieldError = errors && errors[fieldName];

        // Standardised errorMessage for macros
        if (fieldError) {
          // GOV.UK macro expects { text }
          const msg = fieldError.message;

          processed.errorMessage = { text: String(msg) };
        }

        switch (typedFieldConfig.type) {
          case 'text':
          case 'email':
          case 'tel':
          case 'url':
          case 'password':
          case 'number': {
            // @ts-expect-error value is not typed
            processed.value = fieldValue ?? '';
            break;
          }
          case 'textarea': {
            // @ts-expect-error value is not typed
            processed.value = fieldValue ?? '';
            break;
          }
          case 'radios':
          case 'checkboxes':
          case 'select': {
            const baseOptions = (typedFieldConfig.items ?? typedFieldConfig.options ?? []) as (
              | string
              | Record<string, unknown>
            )[];
            const items = baseOptions.map(option => {
              if (typeof option === 'string') {
                const obj = { value: option, text: option } as Record<string, unknown>;
                if (typedFieldConfig.type === 'checkboxes') {
                  obj['checked'] = Array.isArray(fieldValue) && (fieldValue as string[]).includes(option);
                } else if (typedFieldConfig.type === 'select') {
                  obj['selected'] = fieldValue === option;
                } else {
                  obj['checked'] = fieldValue === option;
                }
                return obj;
              } else {
                const obj = { ...option } as Record<string, unknown>;
                const optVal = (option as Record<string, unknown>).value as string;
                if (typedFieldConfig.type === 'checkboxes') {
                  obj['checked'] = Array.isArray(fieldValue) && (fieldValue as string[]).includes(optVal);
                } else if (typedFieldConfig.type === 'select') {
                  obj['selected'] = fieldValue === optVal;
                } else {
                  obj['checked'] = fieldValue === optVal;
                }
                return obj;
              }
            });

            // For selects add default prompt if author didn't supply one
            if (typedFieldConfig.type === 'select' && !(typedFieldConfig.items && typedFieldConfig.items.length)) {
              items.unshift({ value: '', text: 'Choose an option' });
            }

            // @ts-expect-error value is not typed
            processed.items = items;
            break;
          }
          case 'date': {
            // handled earlier building dateItems list, attach now, and set namePrefix so
            // the govukDateInput macro prefixes each item name/id with the field key.
            processed.items = dateItems[fieldName] ?? [];
            // @ts-expect-error namePrefix not in type but allowed by macro
            processed.namePrefix = fieldName;
            break;
          }
          case 'button': {
            // Merge default text and attributes for button fields
            if (!processed.text) {
              processed.text = 'Continue';
            }
            const existingAttrs = processed.attributes ?? {};
            processed.attributes = { type: 'submit', ...existingAttrs };
            break;
          }
        }

        processedFields[fieldName] = processed;
      }

      // Create a new step object with processed fields to avoid mutating original
      step = { ...step, fields: processedFields } as StepConfig;
    }

    return {
      caseId,
      step,
      data,
      allData,
      errors,
      errorSummary: processErrorsForTemplate(errors),
      previousStepUrl,
      summaryRows,
    };
  }

  private hasInputFields(stepConfig: StepConfig): boolean {
    if (!stepConfig.fields) {
      return false;
    }
    return Object.values(stepConfig.fields).some(f => (f as FieldConfig).type !== 'button');
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
        if (!this.hasInputFields(dependencyStep)) {
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

        // this.logger.info('ISENABLED ===>> LaunchDarkly Flag Evaluation', { context, keyToCheck });

        // const flags = await ldClient.allFlagsState(context);
        // this.logger.info('FLAGS ===>> LaunchDarkly ALLLLL Flag Evaluation', flags.allValues(), flags.toJSON());

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
      // this.logger.info('IN LOOP ===>>LaunchDarkly Flag Evaluation', { fieldDefaultKey, isEnabledFlag });
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
      // this.logger.info('Checking prev step visibility', { prevId, fields: prevStep.fields, hasVisibleFields });

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
      const lang = req.body?.lang || req.query?.lang || 'en';
      res.redirect(`${this.basePath}/${Object.keys(this.journey.steps)[0]}?lang=${lang}`);
    });

    router.param('step', (req: Request, res: Response, next: NextFunction, stepId: string) => {
      const sanitizedStepId = this.sanitizePathSegment(stepId);
      const step = this.journey.steps[sanitizedStepId];
      if (!step) {
        return res.status(404).render('not-found');
      }
      (req as RequestWithStep).step = { id: sanitizedStepId, ...step };
      next();
    });

    // ─── GET ───
    router.get('/:step', async (req, res, next) => {
      const caseId = getOrCreateCaseId(req);
      let step = (req as RequestWithStep).step!;

      // TODO: Not keen on this implementation. It's a bit of a hack to get the
      // override to work. Also means multiple calls to LaunchDarkly, with O(n)
      // complexity. Ideally we would only call LaunchDarkly once per step, perhaps using getAllFlags and then
      // checking the flags for the step.

      step = await this.applyLdOverride(step, req);
      step = await this.applyLaunchDarklyFlags(step, req);

      // this.logger.info('LaunchDarkly Flag Evaluation', { step });

      try {
        const { data } = await this.store.load(req, caseId);

        // Auto-skip only if the original step had fields but all of them are now hidden
        const originalFields = this.journey.steps[step.id]?.fields;
        const originallyHadFields = originalFields && Object.keys(originalFields).length > 0;
        const nowHasNoFields = !step.fields || Object.keys(step.fields).length === 0;

        if (originallyHadFields && nowHasNoFields) {
          const nextId = this.resolveNext(step, data);
          if (nextId && nextId !== step.id) {
            const lang = req.body?.lang || req.query?.lang || 'en';
            return res.redirect(`${this.basePath}/${nextId}?lang=${lang}`);
          }
        }

        // Check if the requested step is accessible based on journey progress
        if (!this.isStepAccessible(step.id, data)) {
          // Find the first incomplete step
          const stepIds = Object.keys(this.journey.steps);
          let firstIncompleteStep = stepIds[0];

          for (const stepId of stepIds) {
            const stepConfig = this.journey.steps[stepId] as StepConfig;
            // Skip steps without input fields
            if (!this.hasInputFields(stepConfig)) {
              continue;
            }
            // If this step has no data, it's the first incomplete step
            if (!data[stepId] || Object.keys(data[stepId] as Record<string, unknown>).length === 0) {
              firstIncompleteStep = stepId;
              break;
            }
          }

          // Redirect to the first incomplete step
          const lang = req.body?.lang || req.query?.lang || 'en';
          return res.redirect(`${this.basePath}/${firstIncompleteStep}?lang=${lang}`);
        }

        // Load language and translations
        const language = (req.query.lang || 'en') as string;
        // eslint-disable-next-line no-console
        console.log('step============================================================================ => ', step);
        const translations = loadTranslations(language, ['common', `journeys/${step.id}`]);
        // eslint-disable-next-line no-console
        console.log('trasnlations =================> ', translations);
        if (translations?.title) {
          step.title = translations.title;
        }
        if (translations?.description) {
          step.description = translations.description;
        }

        if (translations?.fields && step.fields) {
          for (const [fieldName, fieldConfig] of Object.entries(step.fields)) {
            const translatedField = translations.fields[fieldName];

            // Apply .text for simple fields (like buttons)
            if (translatedField?.text) {
              fieldConfig.text = translatedField.text;
            }

            // Apply .label
            if (translatedField?.label) {
              fieldConfig.label = translatedField.label;
            }

            // Apply .hint
            if (translatedField?.hint) {
              fieldConfig.hint = translatedField.hint;
            }

            // Apply .errorMessage
            if (translatedField?.errorMessage) {
              fieldConfig.errorMessage = { text: translatedField.errorMessage };
            }

            // Apply .fieldset.legend.text (radios/checkboxes/date)
            if (
              translatedField?.legend &&
              fieldConfig.fieldset?.legend &&
              typeof fieldConfig.fieldset.legend === 'object'
            ) {
              fieldConfig.fieldset.legend.text = translatedField.legend;
            }

            if (Array.isArray(translatedField?.options) && Array.isArray(fieldConfig.options)) {
              const translatedOptionsMap = new Map<string, TranslatableOption>();

              for (const opt of translatedField.options) {
                if (typeof opt === 'string') {
                  translatedOptionsMap.set(opt, { text: opt });
                } else if (typeof opt === 'object' && opt?.value) {
                  translatedOptionsMap.set(opt.value, opt);
                }
              }

              fieldConfig.options = fieldConfig.options.map(opt => {
                const value = typeof opt === 'string' ? opt : opt.value;
                const translatedOption = translatedOptionsMap.get(value);

                if (typeof opt === 'string') {
                  return {
                    value,
                    text: translatedOption?.text ?? value,
                    hint: translatedOption?.hint,
                  };
                }

                return {
                  ...opt,
                  text: translatedOption?.text ?? opt.text,
                  hint: translatedOption?.hint ?? opt.hint,
                };
              });
            }
          }
        }

        let context = this.buildJourneyContext(step, caseId, data);

        // Re-calculate previousStepUrl to skip hidden steps
        const prevVisible = await this.getPreviousVisibleStep(step.id, req, data);

        const lang = req.body?.lang || req.query?.lang || 'en';
        const previousStepUrl = prevVisible ? `${this.basePath}/${prevVisible}?lang=${lang}` : null;

        context = {
          ...context,
          previousStepUrl,
        };

        // If dynamic step, delegate to generateContent
        if (typeof step.generateContent === 'function') {
          const contentFromStep = step.generateContent({ language, translations });
          context = {
            ...context,
            ...contentFromStep,
          };
        } else {
          // Inject common translations for static steps
          const { title, description, fields, ...templateContent } = translations;

          // Inject fields.text for buttons, radios, etc.
          if (translations.fields && step.fields) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const fieldTexts: Record<string, any> = {};
            for (const [fieldName, fieldConfig] of Object.entries(step.fields)) {
              const translatedField = translations.fields[fieldName];
              if (translatedField?.text) {
                fieldConfig.text = translatedField.text;
              }

              // ✅ Add this to make it available to Nunjucks
              fieldTexts[fieldName] = {
                text: fieldConfig.text ?? translatedField?.text ?? '',
              };
            }

            context = {
              ...context,
              fields: fieldTexts,
            };
          }

          context = {
            ...context,
            ...templateContent,
            language,
          };
        }

        const templatePath = await this.resolveTemplatePath(step.id);

        // If we are rendering the confirmation (or other terminal) step, clear the session so the user can start a new journey.
        if (step.type === 'confirmation') {
          const session = req.session as unknown as Record<string, unknown>;
          // Remove the per-journey caseId key so a new journey generates a fresh id next time.
          const caseIdKey = `journey_${this.slug}_caseId`;
          delete session[caseIdKey];

          // Also remove any stored data for this case from the session store implementation (if using sessionStore).
          if (session[caseId]) {
            delete session[caseId as keyof typeof session];
          }
        }

        res.render(templatePath, {
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

        const lang = req.body?.lang || req.query?.lang || 'en';
        res.redirect(`${this.basePath}/${nextId}?lang=${lang}`);
      } catch (err) {
        next(err);
      }
    });

    return router;
  }
}
