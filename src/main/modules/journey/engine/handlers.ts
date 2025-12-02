import { NextFunction, Request, Response } from 'express';
import type { TFunction } from 'i18next';
import i18next from 'i18next';

import { getAddressesByPostcode } from '../../../services/osPostcodeLookupService';

import { ContextBuilder } from './contextBuilder';
import { DataCleanup } from './dataCleanup';
import { FeatureFlags } from './featureFlags';
import { Navigation } from './navigation';
import { FieldConfig, JourneyConfig, StepConfig } from './schema';
import { StepValidation } from './stepValidation';
import { type JourneyStore } from './storage/index';
import { TemplateUtils } from './templateUtils';
import { RequestWithStep } from './types';
import { JourneyValidator } from './validation';

interface HandlerDependencies {
  journey: JourneyConfig;
  slug: string;
  basePath: string;
  store: JourneyStore;
  validator: JourneyValidator;
  logger: {
    warn: (msg: string, ...args: unknown[]) => void;
    error: (msg: string, ...args: unknown[]) => void;
    info: (msg: string, ...args: unknown[]) => void;
  };
}

export class Handlers {
  constructor(private deps: HandlerDependencies) {}

  private async getPreviousVisibleStep(
    currentStepId: string,
    req: Request,
    allData: Record<string, unknown>
  ): Promise<string | null> {
    let prevId = Navigation.findPreviousStep(currentStepId, this.deps.journey, allData);
    while (prevId) {
      let prevStep = { id: prevId, ...this.deps.journey.steps[prevId] } as StepConfig;
      prevStep = await FeatureFlags.applyLaunchDarklyFlags(prevStep, req, this.deps.slug);

      const firstStepId = Object.keys(this.deps.journey.steps)[0];
      const hasVisibleFields = prevStep.fields ? Object.keys(prevStep.fields).length > 0 : false;

      if (prevId === firstStepId || hasVisibleFields) {
        return prevId;
      }

      prevId = Navigation.findPreviousStep(prevId, this.deps.journey, allData);
    }
    return null;
  }

  private reconstructFormData(step: StepConfig, req: Request): Record<string, unknown> {
    const reconstructedData: Record<string, unknown> = { ...req.body };
    if (step.fields) {
      for (const [fieldName, fieldConfig] of Object.entries(step.fields)) {
        const typedFieldConfig = fieldConfig as FieldConfig;
        if (typedFieldConfig.type === 'date') {
          reconstructedData[fieldName] = {
            day: req.body[`${fieldName}-day`] || '',
            month: req.body[`${fieldName}-month`] || '',
            year: req.body[`${fieldName}-year`] || '',
          };
        } else if (typedFieldConfig.type === 'address') {
          // Process address fields from form data (nested structure)
          const addressData = (req.body[fieldName] as Record<string, unknown>) || {};
          reconstructedData[fieldName] = {
            addressLine1: addressData.addressLine1 || '',
            addressLine2: addressData.addressLine2 || '',
            town: addressData.town || '',
            county: addressData.county || '',
            postcode: addressData.postcode || '',
          };
        }
      }
    }
    return reconstructedData;
  }

  async handleGet(req: Request, res: Response, next: NextFunction): Promise<void> {
    const caseId = this.getOrCreateCaseId(req);
    let step = (req as RequestWithStep).step!;

    const lang = (res.locals.lang as string) || 'en';
    const t: TFunction = (res.locals.t as TFunction) || (i18next.t.bind(i18next) as TFunction);

    try {
      // LaunchDarkly override + flags
      step = await FeatureFlags.applyLdOverride(step, req, this.deps.slug);
      step = await FeatureFlags.applyLaunchDarklyFlags(step, req, this.deps.slug);

      const { data: rawData } = await this.deps.store.load(req, caseId);

      // Use the raw data as-is for rendering (cleanup happens at form submission time)
      const data = rawData;

      // Auto-skip only if the original step had fields but all are now hidden
      const originalFields = this.deps.journey.steps[step.id]?.fields;
      const originallyHadFields = originalFields && Object.keys(originalFields).length > 0;
      const nowHasNoFields = !step.fields || Object.keys(step.fields).length === 0;

      if (originallyHadFields && nowHasNoFields) {
        const nextId = Navigation.resolveNext(step, data);
        if (nextId && nextId !== step.id) {
          const validatedNextId = TemplateUtils.validateStepIdForRedirect(nextId, this.deps.journey);
          if (validatedNextId) {
            res.redirect(
              `${this.deps.basePath}/${encodeURIComponent(validatedNextId)}?lang=${encodeURIComponent(lang)}`
            );
            return;
          }
          this.deps.logger.warn(`Invalid next step ID for redirect: ${nextId}`);
        }
      }

      // Check if the requested step is accessible based on journey progress
      if (!StepValidation.isStepAccessible(step.id, this.deps.journey, data)) {
        const stepIds = Object.keys(this.deps.journey.steps);
        let firstIncompleteStep = stepIds[0];

        for (const stepId of stepIds) {
          const stepConfig = this.deps.journey.steps[stepId] as StepConfig;
          if (!StepValidation.hasInputFields(stepConfig)) {
            continue;
          }
          if (!StepValidation.isStepComplete(stepId, this.deps.journey, data)) {
            firstIncompleteStep = stepId;
            break;
          }
        }

        const validatedFirstIncompleteStep = TemplateUtils.validateStepIdForRedirect(
          firstIncompleteStep,
          this.deps.journey
        );
        if (validatedFirstIncompleteStep) {
          res.redirect(
            `${this.deps.basePath}/${encodeURIComponent(validatedFirstIncompleteStep)}?lang=${encodeURIComponent(lang)}`
          );
          return;
        }
        const firstStepId = Object.keys(this.deps.journey.steps)[0];
        const validatedFirstStepId = TemplateUtils.validateStepIdForRedirect(firstStepId, this.deps.journey);
        if (validatedFirstStepId) {
          this.deps.logger.warn(`Invalid first incomplete step ID for redirect: ${firstIncompleteStep}`);
          res.redirect(
            `${this.deps.basePath}/${encodeURIComponent(validatedFirstStepId)}?lang=${encodeURIComponent(lang)}`
          );
          return;
        }
        this.deps.logger.error('Critical error: No valid step IDs found in journey configuration');
        res.status(500).send('Internal server error');
        return;
      }

      let context = ContextBuilder.buildJourneyContext(
        step,
        caseId,
        this.deps.journey,
        this.deps.basePath,
        data,
        t,
        lang
      );

      const prevVisible = await this.getPreviousVisibleStep(step.id, req, data);
      context = {
        ...context,
        previousStepUrl:
          prevVisible && step.type !== 'confirmation'
            ? `${this.deps.basePath}/${encodeURIComponent(prevVisible)}?lang=${encodeURIComponent(lang)}`
            : null,
      };

      const templatePath = await TemplateUtils.resolveTemplatePath(step.id, this.deps.slug, this.deps.journey);
      const safeTemplate = `${TemplateUtils.sanitizeTemplatePath(templatePath)}.njk`;

      // If rendering confirmation, clear session so a new journey generates a fresh caseId
      if (step.type === 'confirmation') {
        const session = req.session as unknown as Record<string, unknown>;
        const caseIdKey = `journey_${this.deps.slug}_caseId`;
        delete session[caseIdKey];
        if (session[caseId]) {
          delete session[caseId as keyof typeof session];
        }
      }

      // Inject any server-side postcode lookup results for this step (no-JS fallback)
      const __sessAny = req.session as unknown as Record<string, unknown>;
      const addressLookup =
        (__sessAny._addressLookup && (__sessAny._addressLookup as Record<string, unknown>)[step.id]) || {};
      res.render(safeTemplate, {
        ...context,
        addressLookup,
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
  }

  async handlePost(req: Request, res: Response, next: NextFunction): Promise<void> {
    const caseId = this.getOrCreateCaseId(req);
    let step = (req as RequestWithStep).step!;

    const lang = (res.locals.lang as string) || 'en';
    const t: TFunction = (res.locals.t as TFunction) || (i18next.t.bind(i18next) as TFunction);

    try {
      step = await FeatureFlags.applyLdOverride(step, req, this.deps.slug);
      step = await FeatureFlags.applyLaunchDarklyFlags(step, req, this.deps.slug);

      // ── Server-side postcode lookup (no-JS fallback) ──
      const __sessAny = req.session as unknown as Record<string, unknown>;
      const addressLookupStore = (__sessAny._addressLookup as Record<string, Record<string, unknown>>) || {};
      const lookupPrefix = (req.body._addressLookup as string) || '';
      const selectPrefix = (req.body._selectAddress as string) || '';

      // Prevent prototype pollution via step.id
      const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
      if (dangerousKeys.includes(step.id)) {
        res.status(400).json({ error: `Invalid step id: ${step.id}` });
        return;
      }

      // Handle "Find address" action
      if (lookupPrefix) {
        const postcode = String(req.body[`${lookupPrefix}-lookupPostcode`] || '').trim();
        // Persist results per step/prefix
        if (!__sessAny._addressLookup) {
          __sessAny._addressLookup = {};
        }
        addressLookupStore[step.id] = addressLookupStore[step.id] || {};

        let addresses: unknown[] = [];
        if (postcode) {
          try {
            addresses = await getAddressesByPostcode(postcode);
          } catch {
            addresses = [];
          }
        }

        addressLookupStore[step.id][lookupPrefix] = { postcode, addresses };

        const { data } = await this.deps.store.load(req, caseId);
        let context = ContextBuilder.buildJourneyContext(
          step,
          caseId,
          this.deps.journey,
          this.deps.basePath,
          data,
          t,
          lang
        );
        const prevVisible = await this.getPreviousVisibleStep(step.id, req, data);
        context = {
          ...context,
          previousStepUrl: prevVisible
            ? `${this.deps.basePath}/${encodeURIComponent(prevVisible)}?lang=${encodeURIComponent(lang)}`
            : null,
        };
        const postTemplatePath =
          TemplateUtils.sanitizeTemplatePath(
            await TemplateUtils.resolveTemplatePath(step.id, this.deps.slug, this.deps.journey)
          ) + '.njk';
        res.status(200).render(postTemplatePath, {
          ...context,
          addressLookup: addressLookupStore[step.id] || {},
        });
        return;
      }

      // Handle "Use this address" action to populate inputs server-side
      if (selectPrefix) {
        const selectedIndexRaw = String(req.body[`${selectPrefix}-selectedAddress`] || '').trim();
        const index = selectedIndexRaw ? parseInt(selectedIndexRaw, 10) : NaN;
        const storeForStep = addressLookupStore[step.id] || {};
        const record = storeForStep[selectPrefix] as unknown as {
          postcode?: string;
          addresses?: Record<string, string>[];
        };
        const sel = Array.isArray(record?.addresses) && Number.isFinite(index) ? record.addresses[index] : null;

        const { data } = await this.deps.store.load(req, caseId);
        const stepData = (data[step.id] as Record<string, unknown>) || {};
        const reconstructedData: Record<string, unknown> = { ...stepData };

        // Process all form fields, not just the selected address
        for (const [fieldName, fieldConfig] of Object.entries(step.fields || {})) {
          if (fieldName === selectPrefix && sel) {
            // Use the selected address data for the clicked component
            reconstructedData[fieldName] = {
              addressLine1: sel.addressLine1 || '',
              addressLine2: sel.addressLine2 || '',
              town: sel.town || '',
              county: sel.county || '',
              postcode: sel.postcode || '',
            };
          } else if (fieldConfig.type === 'address') {
            // Process other address fields from form data (nested structure)
            const addressData = (req.body[fieldName] as Record<string, unknown>) || {};
            reconstructedData[fieldName] = {
              addressLine1: addressData.addressLine1 || '',
              addressLine2: addressData.addressLine2 || '',
              town: addressData.town || '',
              county: addressData.county || '',
              postcode: addressData.postcode || '',
            };
          } else if (fieldConfig.type === 'date') {
            // Process date fields
            reconstructedData[fieldName] = {
              day: req.body[`${fieldName}-day`] || '',
              month: req.body[`${fieldName}-month`] || '',
              year: req.body[`${fieldName}-year`] || '',
            };
          } else {
            // Process other field types
            reconstructedData[fieldName] = req.body[fieldName] || '';
          }
        }

        const patchedAllData = { ...data, [step.id]: reconstructedData };
        let context = ContextBuilder.buildJourneyContext(
          step,
          caseId,
          this.deps.journey,
          this.deps.basePath,
          patchedAllData,
          t,
          lang
        );
        const prevVisible = await this.getPreviousVisibleStep(step.id, req, patchedAllData);
        context = {
          ...context,
          previousStepUrl: prevVisible
            ? `${this.deps.basePath}/${encodeURIComponent(prevVisible)}?lang=${encodeURIComponent(lang)}`
            : null,
        };

        const postTemplatePath =
          TemplateUtils.sanitizeTemplatePath(
            await TemplateUtils.resolveTemplatePath(step.id, this.deps.slug, this.deps.journey)
          ) + '.njk';
        res.status(200).render(postTemplatePath, {
          ...context,
          addressLookup: addressLookupStore[step.id] || {},
        });
        return;
      }

      // Validate using Zod-based validation
      const { data } = await this.deps.store.load(req, caseId);
      const validationResult = this.deps.validator.validate(step, req.body, data);

      if (!validationResult.success) {
        // Reconstruct nested date fields from req.body for template
        const reconstructedData = this.reconstructFormData(step, req);

        // Patch the current step's data with reconstructedData for this render
        const patchedAllData = { ...data, [step.id]: reconstructedData };

        // Build i18n-aware context for error render
        let context = ContextBuilder.buildJourneyContext(
          step,
          caseId,
          this.deps.journey,
          this.deps.basePath,
          patchedAllData,
          t,
          lang,
          validationResult.errors
        );

        const prevVisible = await this.getPreviousVisibleStep(step.id, req, patchedAllData);
        context = {
          ...context,
          previousStepUrl: prevVisible
            ? `${this.deps.basePath}/${encodeURIComponent(prevVisible)}?lang=${encodeURIComponent(lang)}`
            : null,
        };

        const postTemplatePath =
          TemplateUtils.sanitizeTemplatePath(
            await TemplateUtils.resolveTemplatePath(step.id, this.deps.slug, this.deps.journey)
          ) + '.njk';
        res.status(400).render(postTemplatePath, {
          ...context,
        });
        return;
      }

      // Save and move forward
      const { version, data: currentData } = await this.deps.store.load(req, caseId);

      // Apply automatic data cleanup for conditionally required fields
      const cleanedCurrentStepData = await DataCleanup.cleanupConditionalData(
        step,
        validationResult.data || {},
        currentData
      );

      // Also clean up all other steps that might have conditional fields affected by this change
      const allCleanedData = { ...currentData, [step.id]: cleanedCurrentStepData };
      let hasGlobalChanges = false;

      for (const [stepId, stepConfig] of Object.entries(this.deps.journey.steps)) {
        const typedStepConfig = stepConfig as StepConfig;
        if (typedStepConfig.type === 'summary' || typedStepConfig.type === 'confirmation') {
          continue;
        }
        if (!typedStepConfig.fields || Object.keys(typedStepConfig.fields).length === 0) {
          continue;
        }

        // For the current step being submitted, use the cleaned data; for other steps, use original data
        const stepData =
          stepId === step.id
            ? (allCleanedData[stepId] as Record<string, unknown>)
            : (currentData[stepId] as Record<string, unknown>);
        if (!stepData || Object.keys(stepData).length === 0) {
          continue;
        }

        // Always use allCleanedData so the required function sees the updated values
        const cleanedStepData = await DataCleanup.cleanupConditionalData(typedStepConfig, stepData, allCleanedData);

        // Check if cleanup removed any data (compare with original data, not the potentially already cleaned data)
        const originalStepData = currentData[stepId] as Record<string, unknown>;
        if (!originalStepData || Object.keys(cleanedStepData).length !== Object.keys(originalStepData).length) {
          // Explicitly set removed fields to undefined to ensure they're removed from the store
          const finalStepData = { ...cleanedStepData };
          if (originalStepData) {
            for (const key of Object.keys(originalStepData)) {
              if (!(key in cleanedStepData)) {
                finalStepData[key] = undefined;
              }
            }
          }
          allCleanedData[stepId] = finalStepData;
          hasGlobalChanges = true;
        }
      }

      // Save the cleaned data
      let merged: Record<string, unknown>;
      if (hasGlobalChanges) {
        // Save each step individually to ensure proper replacement (not merge)
        let currentVersion = version;
        for (const [stepId, stepData] of Object.entries(allCleanedData)) {
          await this.deps.store.save(req, caseId, currentVersion, { [stepId]: stepData });
          currentVersion++;
        }

        // Reload the final data
        const { data: finalData } = await this.deps.store.load(req, caseId);
        merged = finalData;
      } else {
        // No global changes, just save the current step
        const { data: finalData } = await this.deps.store.save(req, caseId, version, {
          [step.id]: cleanedCurrentStepData,
        });
        merged = finalData;
      }

      // Clear any stored lookup state for this step after a successful save
      if (addressLookupStore[step.id]) {
        delete addressLookupStore[step.id];
      }

      const nextId = Navigation.resolveNext(step, merged);
      const nextStep = this.deps.journey.steps[nextId];

      // Generate reference number if needed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (nextStep?.type === 'confirmation' && (nextStep as any).data?.referenceNumber) {
        const referenceNumber = await this.deps.store.generateReference(req, this.deps.slug, caseId);
        await this.deps.store.save(req, caseId, version + 1, {
          [nextId]: { referenceNumber },
        });
      }

      const validatedNextId = TemplateUtils.validateStepIdForRedirect(nextId, this.deps.journey);
      if (validatedNextId) {
        res.redirect(`${this.deps.basePath}/${encodeURIComponent(validatedNextId)}?lang=${encodeURIComponent(lang)}`);
        return;
      }

      this.deps.logger.error(`Invalid next step ID for redirect: ${nextId}`);
      res.status(500).send('Internal server error');
    } catch (err) {
      next(err);
    }
  }

  getOrCreateCaseId(req: Request): string {
    const session = req.session as unknown as Record<string, unknown>;
    const key = `journey_${this.deps.slug}_caseId`;
    let caseId = session?.[key] as string | undefined;
    if (!caseId) {
      // Generate a new case ID using timestamp and random string (same format as before)
      caseId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
      if (session) {
        session[key] = caseId;
      }
    }
    return caseId;
  }
}
