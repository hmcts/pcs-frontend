import fs from 'fs';
import path from 'path';

import { Logger } from '@hmcts/nodejs-logging';
import * as LDClient from '@launchdarkly/node-server-sdk';
import express, { Express, NextFunction, Request, Response, Router } from 'express';
import { DateTime } from 'luxon';

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
  translations: Record<string, unknown>;
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

  constructor(journeyConfig: JourneyDraft, slug: string, _app: Express, sourcePath?: string) {
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

  /**
   * Sanitizes a full template path by filtering every segment through sanitizePathSegment.
   * This prevents path traversal or injection when the template name is dynamic.
   */
  private sanitizeTemplatePath(template: string): string {
    return template
      .split('/')
      .map(seg => this.sanitizePathSegment(seg))
      .filter(Boolean)
      .join('/');
  }

  /**
   * Validates a step ID for use in redirect URLs - internal data used in redirects should be sanitized to prevent XSS attacks
   * @param stepId - The step ID to validate
   * @returns The validated step ID or null if invalid
   */
  private validateStepIdForRedirect(stepId: string): string | null {
    if (!stepId || typeof stepId !== 'string') {
      return null;
    }

    // Check if the step exists in the journey configuration
    if (!this.journey.steps[stepId]) {
      this.logger.warn(`Invalid step ID for redirect: ${stepId}`);
      return null;
    }

    const sanitizedStepId = this.sanitizePathSegment(stepId);

    // If sanitization changed the step ID, it contained unsafe characters
    if (sanitizedStepId !== stepId) {
      this.logger.warn(`Step ID contained unsafe characters: ${stepId}`);
      return null;
    }

    return sanitizedStepId;
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
      WizardEngine.templatePathCache.set(cacheKey, step.template);
      return step.template;
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
  private buildSummaryRows(
    allData: Record<string, unknown>,
    t: (key: unknown) => string,
    currentLang?: string
  ): SummaryRow[] {
    return Object.entries(this.journey.steps)
      .filter(([stepId, stepConfig]) => {
        const typedStepConfig = stepConfig as StepConfig;
        if (typedStepConfig.type === 'summary' || typedStepConfig.type === 'confirmation') {
          return false;
        }
        if (!typedStepConfig.fields || Object.keys(typedStepConfig.fields).length === 0) {
          return false;
        }
        const stepData = allData[stepId] as Record<string, unknown>;
        return stepData && Object.keys(stepData).length > 0;
      })
      .map(([stepId, stepConfig]) => {
        const typedStepConfig = stepConfig as StepConfig;
        const stepData = allData[stepId] as Record<string, unknown>;

        // Work out the row label; prefer a page-heading legend if present
        let rowLabel: string = (typedStepConfig.title as string) || stepId;
        if (typedStepConfig.fields) {
          for (const fieldCfg of Object.values(typedStepConfig.fields)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const legend = (fieldCfg as FieldConfig).fieldset?.legend as any;
            if (legend && typeof legend === 'object' && legend.isPageHeading) {
              const raw =
                (typeof legend.text === 'string' && legend.text) ||
                (typeof legend.html === 'string' && legend.html) ||
                rowLabel;
              rowLabel = typeof raw === 'string' ? t(raw) : rowLabel;
              break;
            }
          }
        }
        // If rowLabel is a key, translate it too
        if (typeof rowLabel === 'string') {
          rowLabel = t(rowLabel);
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
              const { day, month, year } = value as Record<string, string>;
              const dTrim = day?.trim() ?? '';
              const mTrim = month?.trim() ?? '';
              const yTrim = year?.trim() ?? '';
              if (!dTrim && !mTrim && !yTrim) {
                return '';
              }
              const dt = DateTime.fromObject({
                day: Number(dTrim),
                month: Number(mTrim),
                year: Number(yTrim),
              });
              return dt.isValid ? dt.toFormat('d MMMM yyyy') : `${dTrim}/${mTrim}/${yTrim}`;
            }

            if (
              typedFieldConfig.type === 'checkboxes' ||
              typedFieldConfig.type === 'radios' ||
              typedFieldConfig.type === 'select'
            ) {
              const items = typedFieldConfig.items ?? typedFieldConfig.options;
              const selected = items
                ?.filter(option => {
                  const optionValue = typeof option === 'string' ? option : option.value;
                  if (typedFieldConfig.type === 'checkboxes') {
                    return Array.isArray(value) && (value as string[]).includes(optionValue);
                  }
                  // radios & select store single string value
                  return value === optionValue;
                })
                .map(option => {
                  if (typeof option === 'string') {
                    // option is a key → translate
                    return t(option);
                  } else {
                    // option.text might be a key → translate
                    return typeof option.text === 'string' ? t(option.text) : option.text;
                  }
                })
                .join(', ');
              return selected ?? '';
            }

            return Array.isArray(value) ? value.join(', ') : String(value);
          });

        const href = currentLang
          ? `${this.basePath}/${stepId}?lang=${encodeURIComponent(currentLang)}`
          : `${this.basePath}/${stepId}`;

        return {
          key: { text: rowLabel },
          value: { text: fieldValues.join(', ') },
          actions: {
            items: [
              {
                href,
                text: t('change') || 'Change',
                visuallyHiddenText: rowLabel.toLowerCase(),
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
    lang: string,
    errors?: Record<string, { day?: string; month?: string; year?: string; message: string; anchor?: string }>
  ): JourneyContext & { dateItems?: Record<string, { name: string; classes: string; value: string }[]> } {
    const previousStepUrl = this.findPreviousStep(step.id, allData);

    const data = (allData[step.id] as Record<string, unknown>) || {};

    // Load translations for the current step and the common translations
    const namespaces = ['common', 'eligibility'];
    const translations = loadTranslations(lang, namespaces) as Record<string, unknown>;

    // eslint-disable-next-line no-console
    console.log('translation => ', translations);

    // eslint-disable-next-line @typescript-eslint/no-shadow
    const getPath = (obj: unknown, path: string): unknown =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      path.split('.').reduce((acc: any, part) => (acc && typeof acc === 'object' ? acc[part] : undefined), obj);

    const t = (key: unknown): string => {
      if (typeof key !== 'string') {
        return String(key ?? '');
      }
      const v = getPath(translations, key);
      return typeof v === 'string' ? v : key; // fallback to the key if missing
    };

    const summaryRows = step.type === 'summary' ? this.buildSummaryRows(allData, t, lang) : undefined;

    // Build dateItems for all date fields
    const dateItems: Record<string, { name: string; classes: string; value: string }[]> = {};
    if (step.fields) {
      for (const [fieldName, fieldConfig] of Object.entries(step.fields)) {
        const typedFieldConfig = fieldConfig as FieldConfig;
        if (typedFieldConfig.type === 'date') {
          const fieldValue = data[fieldName] as Record<'day' | 'month' | 'year', string | undefined>;
          const fieldError = errors && errors[fieldName];
          const hasPartSpecificErrors = !!(
            fieldError &&
            typeof fieldError === 'object' &&
            (fieldError.day || fieldError.month || fieldError.year)
          );

          dateItems[fieldName] = (['day', 'month', 'year'] as ('day' | 'month' | 'year')[]).map(part => {
            const partHasError = !!(
              fieldError &&
              typeof fieldError === 'object' &&
              (hasPartSpecificErrors ? fieldError[part] : true)
            );
            // Name stays as day/month/year – macro will apply the field prefix.
            return {
              name: part,
              classes:
                (part === 'day'
                  ? 'govuk-input--width-2'
                  : part === 'month'
                    ? 'govuk-input--width-2'
                    : 'govuk-input--width-4') + (partHasError ? ' govuk-input--error' : ''),
              value: fieldValue?.[part] || '',
            };
          });
        }
      }
    }

    // ── Make a translated copy of the step (do NOT mutate cached journey) ───────
    const processedFields: Record<string, FieldConfig> = {};
    let stepCopy: StepConfig = { ...step };

    // Translate step-level title/description if they are keys
    if (typeof stepCopy.title === 'string') {
      stepCopy.title = t(stepCopy.title);
    }
    if (typeof stepCopy.description === 'string') {
      stepCopy.description = t(stepCopy.description);
    }

    if (step.fields) {
      for (const [fieldName, fieldConfig] of Object.entries(step.fields)) {
        const typedFieldConfig = fieldConfig as FieldConfig;
        const processed: FieldConfig = { ...typedFieldConfig };

        // Ensure id / name
        if (!processed.id) {
          processed.id = fieldName;
        }
        if (!processed.name) {
          processed.name = fieldName;
        }

        const fieldValue = data[fieldName] as unknown;
        const fieldError = errors && errors[fieldName];

        // Translate error message if present
        if (fieldError) {
          processed.errorMessage = { text: t(fieldError.message) };
        }

        // Translate label
        if (typedFieldConfig.label && typeof typedFieldConfig.label === 'object') {
          const newLabel = { ...(typedFieldConfig.label as Record<string, unknown>) };
          if (typeof newLabel.text === 'string') {
            newLabel.text = t(newLabel.text);
          }
          if (typeof newLabel.html === 'string') {
            newLabel.html = t(newLabel.html);
          }
          processed.label = newLabel;
        } else if (typeof typedFieldConfig.label === 'string') {
          processed.label = { text: t(typedFieldConfig.label) };
        }

        // Translate hint
        if (typedFieldConfig.hint && typeof typedFieldConfig.hint === 'object') {
          const newHint = { ...(typedFieldConfig.hint as Record<string, unknown>) };
          if (typeof newHint.text === 'string') {
            newHint.text = t(newHint.text);
          }
          if (typeof newHint.html === 'string') {
            newHint.html = t(newHint.html);
          }
          processed.hint = newHint;
        } else if (typeof typedFieldConfig.hint === 'string') {
          processed.hint = { text: t(typedFieldConfig.hint) };
        }

        // Translate fieldset.legend.{text|html}
        if (typedFieldConfig.fieldset?.legend) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const legend = typedFieldConfig.fieldset.legend as any;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const newLegend: any = { ...legend };
          if (typeof newLegend.text === 'string') {
            newLegend.text = t(newLegend.text);
          }
          if (typeof newLegend.html === 'string') {
            newLegend.html = t(newLegend.html);
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          processed.fieldset = { ...(typedFieldConfig.fieldset as any), legend: newLegend };
        }

        // Handle values and options
        switch (typedFieldConfig.type) {
          case 'text':
          case 'email':
          case 'tel':
          case 'url':
          case 'password':
          case 'number':
          case 'textarea': {
            processed.value = typeof fieldValue === 'string' || typeof fieldValue === 'number' ? fieldValue : '';
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
                // Translate the displayed text; value stays as the raw string
                const obj = { value: option, text: t(option) } as Record<string, unknown>;

                if (typedFieldConfig.type === 'checkboxes') {
                  obj['checked'] = Array.isArray(fieldValue) && (fieldValue as string[]).includes(option);
                } else if (typedFieldConfig.type === 'select') {
                  obj['selected'] = fieldValue === option;
                } else {
                  obj['checked'] = fieldValue === option;
                }
                return obj;
              } else {
                // Copy existing option, and translate text/html if they are string keys
                const obj = { ...option } as Record<string, unknown>;
                const optVal = (option as Record<string, unknown>).value as string;

                if (typeof obj.text === 'string') {
                  obj.text = t(obj.text);
                }
                if (typeof obj.html === 'string') {
                  obj.html = t(obj.html);
                }

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

            // Keep EXACT original behaviour: only add a prompt when the author didn't supply items.
            if (typedFieldConfig.type === 'select' && !(typedFieldConfig.items && typedFieldConfig.items.length)) {
              items.unshift({ value: '', text: t('chooseOption') || 'Choose an option' });
            }

            // @ts-expect-error value is not typed
            processed.items = items;
            break;
          }

          case 'date': {
            processed.items = dateItems[fieldName] ?? [];
            processed.namePrefix = fieldName;
            break;
          }

          case 'button': {
            // Translate provided text key or fallback to common.continue
            processed.text = processed.text ? t(processed.text) : t('buttons.continue') || 'Continue';
            const existingAttrs = processed.attributes ?? {};
            processed.attributes = { type: 'submit', ...existingAttrs };
            break;
          }
        }

        processedFields[fieldName] = processed;
      }

      stepCopy = { ...stepCopy, fields: processedFields } as StepConfig;
    }

    return {
      caseId,
      step: stepCopy,
      data,
      allData,
      errors,
      errorSummary: processErrorsForTemplate(errors, stepCopy, t),
      previousStepUrl,
      summaryRows,
      translations,
    };
  }

  private hasInputFields(stepConfig: StepConfig): boolean {
    if (!stepConfig.fields) {
      return false;
    }
    return Object.values(stepConfig.fields).some(f => (f as FieldConfig).type !== 'button');
  }

  // Check if a step is accessible based on journey progress
  private isStepComplete(stepId: string, allData: Record<string, unknown>): boolean {
    const stepConfig = this.journey.steps[stepId] as StepConfig;
    const stepData = allData[stepId] as Record<string, unknown>;

    // If no data exists for the step, check if it has explicitly required fields
    if (!stepData) {
      if (!stepConfig.fields) {
        return true;
      }

      const hasRequiredFields = Object.values(stepConfig.fields).some((field: FieldConfig) => {
        if (field.type === 'button') {
          return false;
        }
        return field.validate?.required === true; // only explicitly required
      });

      return !hasRequiredFields;
    }

    // If step has data, check that all explicitly required fields are present
    if (stepConfig.fields) {
      for (const [fieldName, fieldConfig] of Object.entries(stepConfig.fields)) {
        const f = fieldConfig as FieldConfig;

        // buttons don't gate progress
        if (f.type === 'button') {
          continue;
        }

        // only enforce when required is explicitly true
        if (f.validate?.required === true) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const v = (stepData as any)[fieldName];

          const isEmpty = () => {
            switch (f.type) {
              case 'date': {
                const dv = v as { day?: string; month?: string; year?: string } | undefined;
                return !dv || !dv.day || !dv.month || !dv.year;
              }
              case 'checkboxes':
                return !Array.isArray(v) || v.length === 0;

              case 'radios':
              case 'select':
                return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

              case 'number':
                // allow 0 as valid
                return v === undefined || v === null || v === '';

              default:
                // text/email/tel/url/password/textarea/file etc.
                return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
            }
          };

          if (isEmpty()) {
            return false;
          }
        }
      }
    }

    return true;
  }

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

        if (!this.isStepComplete(dependency, allData)) {
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

      // Extract lang from query or body, defaulting to 'en'
      const lang = req.body?.lang || req.query?.lang || 'en'; // Retrieve language from request body or query
      res.locals.lang = lang; // Make language available in templates

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
      const firstStepId = Object.keys(this.journey.steps)[0];
      const validatedFirstStepId = this.validateStepIdForRedirect(firstStepId);
      if (validatedFirstStepId) {
        res.redirect(`${this.basePath}/${encodeURIComponent(validatedFirstStepId)}?lang=${lang}`);
      } else {
        this.logger.error('Critical error: No valid step IDs found in journey configuration');
        res.status(500).send('Internal server error');
      }
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

      const lang = req.body?.lang || req.query?.lang || 'en';
      try {
        const { data } = await this.store.load(req, caseId);

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
            // If this step is not complete, it's the first incomplete step
            if (!this.isStepComplete(stepId, data)) {
              firstIncompleteStep = stepId;
              break;
            }
          }

          // Redirect to the first incomplete step
          const validatedFirstIncompleteStep = this.validateStepIdForRedirect(firstIncompleteStep);
          if (validatedFirstIncompleteStep) {
            return res.redirect(`${this.basePath}/${encodeURIComponent(validatedFirstIncompleteStep)}?lang=${lang}`);
          }
          // If validation fails, redirect to the first step in the journey
          const firstStepId = Object.keys(this.journey.steps)[0];
          const validatedFirstStepId = this.validateStepIdForRedirect(firstStepId);
          if (validatedFirstStepId) {
            this.logger.warn(`Invalid first incomplete step ID for redirect: ${firstIncompleteStep}`);
            return res.redirect(`${this.basePath}/${encodeURIComponent(validatedFirstStepId)}?lang=${lang}`);
          }
          // If even the first step is invalid, this is a critical error
          this.logger.error('Critical error: No valid step IDs found in journey configuration');
          return res.status(500).send('Internal server error');
        }

        let context = this.buildJourneyContext(step, caseId, data, lang); // Pass lang as argument

        // Re-calculate previousStepUrl to skip hidden steps
        const prevVisible = await this.getPreviousVisibleStep(step.id, req, data);
        context = {
          ...context,
          previousStepUrl: prevVisible ? `${this.basePath}/${prevVisible}?lang=${lang}` : null,
        };

        const templatePath = await this.resolveTemplatePath(step.id);
        const safeTemplate = `${this.sanitizeTemplatePath(templatePath)}.njk`;

        // Render the template with lang included
        res.render(safeTemplate, {
          ...context,
          lang: res.locals.lang,
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

      const lang = req.body?.lang || req.query?.lang || 'en'; // Extract the language parameter
      res.locals.lang = lang; // Store language in locals for template rendering

      const validationResult = this.validator.validate(step, req.body);

      if (!validationResult.success) {
        const { data } = await this.store.load(req, caseId);
        const reconstructedData = { ...req.body };

        // Handle date field reconstruction logic here if needed
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

        const patchedAllData = { ...data, [step.id]: reconstructedData };
        const context = this.buildJourneyContext(step, caseId, patchedAllData, lang, validationResult.errors); // Pass lang as argument

        const postTemplatePath = this.sanitizeTemplatePath(await this.resolveTemplatePath(step.id)) + '.njk';
        return res.status(400).render(postTemplatePath, {
          ...context,
          lang: res.locals.lang,
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

        // Handle reference number generation for confirmation steps
        if (nextStep?.type === 'confirmation' && nextStep.data?.referenceNumber) {
          const referenceNumber = await this.store.generateReference(req, this.slug, caseId);
          await this.store.save(req, caseId, version + 1, {
            [nextId]: { referenceNumber },
          });
        }

        const validatedNextId = this.validateStepIdForRedirect(nextId);
        if (validatedNextId) {
          res.redirect(`${this.basePath}/${encodeURIComponent(validatedNextId)}?lang=${lang}`);
        } else {
          this.logger.error(`Invalid next step ID for redirect: ${nextId}`);
          res.status(500).send('Internal server error');
        }
      } catch (err) {
        next(err);
      }
    });

    return router;
  }
}
