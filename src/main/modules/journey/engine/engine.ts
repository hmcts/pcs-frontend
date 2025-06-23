import fs from 'fs';
import path from 'path';

import { Logger } from '@hmcts/nodejs-logging';
import express, { NextFunction, Request, Response, Router } from 'express';

import { oidcMiddleware } from '../../../middleware/oidc';

import { FieldConfig, JourneyConfig, JourneySchema, StepConfig } from './schema';
import { JourneyStore } from './storage/index';
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

  logger = Logger.getLogger('WizardEngine');

  constructor(
    filePath: string,
    private readonly store: JourneyStore,
    slug: string
  ) {
    // Check if we already have a validated journey for this slug
    const cachedJourney = WizardEngine.validatedJourneys.get(slug);
    if (cachedJourney) {
      this.journey = cachedJourney;
      this.slug = slug;
      this.basePath = `/${slug}`;
      this.validator = new JourneyValidator();
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
  private buildSummaryRows(allData: Record<string, unknown>, caseId: string): SummaryRow[] {
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
            if (typedFieldConfig.type === 'address' && value && typeof value === 'object') {
              const addressValue = value as {
                addressLine1?: string;
                addressLine2?: string;
                addressLine3?: string;
                town?: string;
                postcode?: string;
              };
              const addressParts = [
                addressValue.addressLine1,
                addressValue.addressLine2,
                addressValue.addressLine3,
                addressValue.town,
                addressValue.postcode,
              ].filter(Boolean);
              return addressParts.join(', ');
            }
            return Array.isArray(value) ? value.join(', ') : String(value);
          });

        return {
          key: { text: typedStepConfig.title || stepId },
          value: { text: fieldValues.join(', ') },
          actions: {
            items: [
              {
                href: `${this.basePath}/${caseId}/${stepId}`,
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
    const summaryRows = step.type === 'summary' ? this.buildSummaryRows(allData, caseId) : undefined;
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

  // Perform address lookup using the OS Postcode service
  private async performAddressLookup(postcode: string): Promise<Record<string, unknown>[]> {
    try {
      const { getAddressesByPostcode } = await import('../../../services/osPostcodeLookupService');
      const addresses = await getAddressesByPostcode(postcode);
      this.logger.info('Addresses:', addresses);
      return addresses as unknown as Record<string, unknown>[];
    } catch (error) {
      this.logger.error('Address lookup failed:', error);
      return [];
    }
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

    // Add route to start a new journey
    router.get('/', (req, res) => {
      // Generate a new case ID using timestamp and random number
      const caseId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
      res.redirect(`${this.basePath}/${caseId}/${Object.keys(this.journey.steps)[0]}`);
    });

    router.param('step', (req: Request, res: Response, next: NextFunction, stepId: string) => {
      const step = this.journey.steps[stepId];
      if (!step) {
        return res.status(404).send('Unknown step');
      }
      (req as RequestWithStep).step = { id: stepId, ...step };
      next();
    });

    // ─── GET ───
    router.get('/:caseId/:step', async (req, res, next) => {
      const { caseId } = req.params;
      const step = (req as RequestWithStep).step!;

      try {
        const { data } = await this.store.load(req, Number(caseId));

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
          return res.redirect(`${this.basePath}/${caseId}/${firstIncompleteStep}`);
        }

        const context = this.buildJourneyContext(step, caseId, data);

        res.render(await this.resolveTemplatePath(step.id), {
          ...context,
          // Legacy compatibility
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
    router.post('/:caseId/:step', express.urlencoded({ extended: true }), async (req, res, next) => {
      const { caseId } = req.params;
      const step = (req as RequestWithStep).step!;
      const action = req.query.action as string;

      // Handle address field actions
      if (action && ['lookup', 'select', 'manual'].includes(action)) {
        try {
          const { data } = await this.store.load(req, Number(caseId));
          const stepData = (data[step.id] as Record<string, unknown>) || {};

          if (action === 'lookup') {
            // Handle postcode lookup
            const postcodeField = Object.keys(step.fields || {}).find(
              fieldName => step.fields![fieldName].type === 'address'
            );

            if (postcodeField) {
              const postcode = req.body[`postcode-${postcodeField}`]?.trim();
              if (postcode) {
                try {
                  const addresses = await this.performAddressLookup(postcode);
                  const updatedStepData = {
                    ...stepData,
                    [postcodeField]: {
                      postcode,
                      addresses,
                      manualEntry: false,
                    },
                  };

                  this.logger.info('Updated step data:', updatedStepData);

                  await this.store.save(req, Number(caseId), 0, {
                    [step.id]: updatedStepData,
                  });

                  return res.redirect(`${this.basePath}/${caseId}/${step.id}`);
                } catch (error) {
                  // Handle lookup error - redirect back with error
                  return res.redirect(`${this.basePath}/${caseId}/${step.id}?error=lookup_failed`);
                }
              }
            }
          } else if (action === 'select') {
            // Handle address selection
            const addressField = Object.keys(step.fields || {}).find(
              fieldName => step.fields![fieldName].type === 'address'
            );

            if (addressField) {
              const selectedIndex = req.body[`selected-address-${addressField}`];
              const currentAddressData = stepData[addressField] as Record<string, unknown>;

              if (selectedIndex !== undefined && currentAddressData?.addresses) {
                const addresses = currentAddressData.addresses as Record<string, unknown>[];
                const selectedAddress = addresses[parseInt(selectedIndex)];
                if (selectedAddress) {
                  const updatedStepData = {
                    ...stepData,
                    [addressField]: {
                      ...selectedAddress,
                      manualEntry: false,
                    },
                  };

                  await this.store.save(req, Number(caseId), 0, {
                    [step.id]: updatedStepData,
                  });

                  return res.redirect(`${this.basePath}/${caseId}/${step.id}`);
                }
              }
            }
          } else if (action === 'manual') {
            // Handle manual address entry
            const addressField = Object.keys(step.fields || {}).find(
              fieldName => step.fields![fieldName].type === 'address'
            );

            if (addressField) {
              const manualAddress = {
                addressLine1: req.body[`addressLine1-${addressField}`] || '',
                addressLine2: req.body[`addressLine2-${addressField}`] || '',
                addressLine3: req.body[`addressLine3-${addressField}`] || '',
                town: req.body[`town-${addressField}`] || '',
                county: req.body[`county-${addressField}`] || '',
                postcode: req.body[`manual-postcode-${addressField}`] || '',
                manualEntry: true,
              };

              const updatedStepData = {
                ...stepData,
                [addressField]: manualAddress,
              };

              await this.store.save(req, Number(caseId), 0, {
                [step.id]: updatedStepData,
              });

              return res.redirect(`${this.basePath}/${caseId}/${step.id}`);
            }
          }

          // If we get here, redirect back to the step
          return res.redirect(`${this.basePath}/${caseId}/${step.id}`);
        } catch (err) {
          next(err);
        }
        return; // Exit early for address actions
      }

      // Normal form validation and processing
      const validationResult = this.validator.validate(step, req.body);

      if (!validationResult.success) {
        const { data } = await this.store.load(req, Number(caseId));
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
            // Handle address fields - they come as JSON strings
            if (typedFieldConfig.type === 'address') {
              try {
                const addressData = req.body[fieldName];
                if (addressData && typeof addressData === 'string') {
                  reconstructedData[fieldName] = JSON.parse(addressData);
                } else {
                  reconstructedData[fieldName] = addressData || {};
                }
              } catch (e) {
                // If JSON parsing fails, use empty object
                reconstructedData[fieldName] = {};
              }
            }
          }
        }
        // Patch the current step's data with reconstructedData for this render
        const patchedAllData = { ...data, [step.id]: reconstructedData };
        const context = this.buildJourneyContext(step, caseId, patchedAllData, validationResult.errors);

        return res.status(400).render(await this.resolveTemplatePath(step.id), {
          ...context,
          errors: validationResult.errors,
        });
      }

      try {
        const { version } = await this.store.load(req, Number(caseId));
        const { data: merged } = await this.store.save(req, Number(caseId), version, {
          [step.id]: validationResult.data || {},
        });

        const nextId = this.resolveNext(step, merged);
        const nextStep = this.journey.steps[nextId];

        // If transitioning to a confirmation step, generate reference number
        if (nextStep?.type === 'confirmation' && nextStep.data?.referenceNumber) {
          const referenceNumber = await this.store.generateReference(req, this.slug, Number(caseId));

          // Save the generated reference to the confirmation step data
          await this.store.save(req, Number(caseId), version + 1, {
            [nextId]: { referenceNumber },
          });
        }

        res.redirect(`${this.basePath}/${caseId}/${nextId}`);
      } catch (err) {
        next(err);
      }
    });

    return router;
  }
}
