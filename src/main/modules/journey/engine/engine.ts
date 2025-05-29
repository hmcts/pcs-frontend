import fs from 'fs';
import path from 'path';

import express, { NextFunction, Request, Response, Router } from 'express';

import { Journey, JourneySchema } from './schema';
import { JourneyStore } from './storage/index';

// Define types for step and field configuration
interface StepConfig {
  id: string;
  title?: string;
  type?: string;
  fields?: Record<string, FieldConfig>;
  next?: string | NextConfig;
}

interface FieldConfig {
  type?: string;
  label?: string;
  validate?: {
    required?: string;
    minLength?: number;
    regex?: string;
    message?: string;
  };
}

interface NextConfig {
  when: string;
  goto: string;
  else: string;
}

// Extend Express Request interface
interface RequestWithStep extends Request {
  step?: StepConfig;
}

export class WizardEngine {
  public readonly journey: Journey;
  public readonly slug: string;
  public readonly basePath: string;

  constructor(
    filePath: string,
    private readonly store: JourneyStore,
    slug: string
  ) {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    this.journey = JourneySchema.parse(raw);
    this.slug = slug;
    this.basePath = `/${slug}`;
  }

  private evalExpr(expr: string, ctx: Record<string, unknown>): boolean {
    try {
      return Function(...Object.keys(ctx), `return (${expr});`)(...Object.values(ctx));
    } catch (error) {
      // If evaluation fails (e.g., variable not defined), return false as default
      return false;
    }
  }

  private validate(step: StepConfig, submission: Record<string, unknown>) {
    const errs: Record<string, string> = {};
    for (const [name, cfg] of Object.entries(step.fields ?? {})) {
      const val = submission[name];
      if (cfg.validate?.required && !val) {
        errs[name] = cfg.validate.required;
        continue;
      }
      if (cfg.validate?.minLength && typeof val === 'string' && val.length < cfg.validate.minLength) {
        errs[name] = cfg.validate.message ?? 'Too short';
      }
      if (cfg.validate?.regex && typeof val === 'string' && !new RegExp(cfg.validate.regex).test(val)) {
        errs[name] = cfg.validate.message ?? 'Invalid format';
      }
    }
    return Object.keys(errs).length ? { success: false, error: errs } : { success: true, data: submission };
  }

  private resolveNext(step: StepConfig, allData: Record<string, unknown>): string {
    const nxt = step.next;
    if (!nxt) {
      return step.id;
    }
    if (typeof nxt === 'string') {
      return nxt;
    }

    // Flatten the data for expression evaluation
    // Convert {start: {hasProvisional: 'yes'}} to {hasProvisional: 'yes'}
    const flattenedData: Record<string, unknown> = {};
    for (const stepData of Object.values(allData)) {
      if (stepData && typeof stepData === 'object') {
        Object.assign(flattenedData, stepData);
      }
    }

    console.log('Resolving next for step:', step.id);
    console.log('Expression:', nxt.when);
    console.log('All data:', allData);
    console.log('Flattened data:', flattenedData);

    const ok = this.evalExpr(nxt.when, flattenedData);
    console.log('Expression result:', ok);
    console.log('Going to:', ok ? nxt.goto : nxt.else);

    return ok ? nxt.goto : nxt.else;
  }

  private findPreviousStep(currentStepId: string, allData: Record<string, unknown>): string | null {
    // For the first step, there's no previous step
    const stepIds = Object.keys(this.journey.steps);
    if (currentStepId === stepIds[0]) {
      return null;
    }

    // Simple approach: find which step directly leads to current step
    // by checking each step's next configuration
    for (const [stepId, stepConfig] of Object.entries(this.journey.steps)) {
      const nextStepId = this.resolveNext({ id: stepId, ...stepConfig }, allData);
      if (nextStepId === currentStepId) {
        return stepId;
      }
    }

    // If no direct predecessor found, return the previous step in definition order
    const currentIndex = stepIds.indexOf(currentStepId);
    return currentIndex > 0 ? stepIds[currentIndex - 1] : null;
  }

  private resolveTemplatePath(stepId: string): string {
    // Check if step has a generic type that should use default templates
    const step = this.journey.steps[stepId];
    const stepType = step?.type;

    // For generic step types, try default template first
    if (stepType === 'summary' || stepType === 'confirmation') {
      const defaultTemplatePath = path.join('_defaults', stepId);
      // Check if journey-specific template exists, otherwise use default
      const journeySpecificPath = path.join(this.slug, stepId);

      try {
        // Check if journey-specific template exists
        const viewsDir = path.join(__dirname, '..', '..', 'views');
        const journeyTemplatePath = path.join(viewsDir, `${journeySpecificPath}.njk`);
        fs.accessSync(journeyTemplatePath);
        return journeySpecificPath;
      } catch {
        // Fall back to default template
        return defaultTemplatePath;
      }
    }

    // For all other steps, use journey-specific template
    return path.join(this.slug, stepId);
  }

  private buildSummaryRows(
    allData: Record<string, unknown>,
    caseId: string
  ): {
    key: { text: string };
    value: { text: string };
    actions?: { items: { href: string; text: string; visuallyHiddenText: string }[] };
  }[] {
    const summaryRows: {
      key: { text: string };
      value: { text: string };
      actions?: { items: { href: string; text: string; visuallyHiddenText: string }[] };
    }[] = [];

    // Iterate through each step in the journey
    for (const [stepId, stepConfig] of Object.entries(this.journey.steps)) {
      // Skip summary and confirmation steps
      if (stepConfig.type === 'summary' || stepConfig.type === 'confirmation') {
        continue;
      }

      // Check if this step has any data
      const stepData = allData[stepId] as Record<string, unknown>;
      if (!stepData) {
        continue;
      }

      // If step has fields defined, show individual field values
      if (stepConfig.fields) {
        for (const [fieldName, fieldConfig] of Object.entries(stepConfig.fields)) {
          const fieldValue = stepData[fieldName];
          if (fieldValue) {
            // Use field label if available, otherwise use field name
            const fieldLabel = (fieldConfig as FieldConfig).label || fieldName;
            const changeUrl = `${this.basePath}/${caseId}/${stepId}`;

            summaryRows.push({
              key: { text: fieldLabel },
              value: { text: String(fieldValue) },
              actions: {
                items: [
                  {
                    href: changeUrl,
                    text: 'Change',
                    visuallyHiddenText: `change ${fieldLabel.toLowerCase()}`,
                  },
                ],
              },
            });
          }
        }
      } else {
        // If no fields defined, show step title with raw data
        const stepTitle = stepConfig.title || stepId;
        const changeUrl = `${this.basePath}/${caseId}/${stepId}`;

        summaryRows.push({
          key: { text: stepTitle },
          value: { text: JSON.stringify(stepData) },
          actions: {
            items: [
              {
                href: changeUrl,
                text: 'Change',
                visuallyHiddenText: `change ${stepTitle.toLowerCase()}`,
              },
            ],
          },
        });
      }
    }

    return summaryRows;
  }

  router(): Router {
    const r = Router();

    r.use((req, res, next) => {
      res.locals.journey = this.journey;
      res.locals.slug = this.slug;
      next();
    });

    r.param('step', (req: Request, res: Response, next: NextFunction, stepId: string) => {
      const step = this.journey.steps[stepId];
      if (!step) {
        return res.status(404).send('Unknown step');
      }
      (req as RequestWithStep).step = { id: stepId, ...step };
      next();
    });

    // ─── GET ───
    r.get('/:caseId/:step', async (req, res, next) => {
      const { caseId } = req.params;
      const step = (req as RequestWithStep).step!;
      try {
        const { data } = await this.store.load(req, Number(caseId));
        const previousStepId = this.findPreviousStep(step.id, data);
        const previousStepUrl = previousStepId ? `${this.basePath}/${caseId}/${previousStepId}` : null;

        // Build summary rows for summary-type steps
        const summaryRows = step.type === 'summary' ? this.buildSummaryRows(data, caseId) : [];

        res.render(this.resolveTemplatePath(step.id), {
          data: data[step.id] ?? {},
          errors: null,
          allData: data,
          caseId,
          step,
          previousStepUrl,
          summaryRows,
        });
      } catch (err) {
        next(err);
      }
    });

    // ─── POST ───
    r.post('/:caseId/:step', express.urlencoded({ extended: true }), async (req, res, next) => {
      const { caseId } = req.params;
      const step = (req as RequestWithStep).step!;
      const { success, data: valid, error } = this.validate(step, req.body);

      if (!success) {
        const { data } = await this.store.load(req, Number(caseId));
        const previousStepId = this.findPreviousStep(step.id, data);
        const previousStepUrl = previousStepId ? `${this.basePath}/${caseId}/${previousStepId}` : null;

        return res.status(400).render(this.resolveTemplatePath(step.id), {
          data: req.body,
          errors: error,
          allData: data,
          caseId,
          step,
          previousStepUrl,
        });
      }

      try {
        const { version } = await this.store.load(req, Number(caseId));
        const { data: merged } = await this.store.save(req, Number(caseId), version, { [step.id]: valid });
        const nextId = this.resolveNext(step, merged);
        res.redirect(`${this.basePath}/${caseId}/${nextId}`);
      } catch (err) {
        next(err);
      }
    });

    return r;
  }
}
