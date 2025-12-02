import fs from 'fs';
import path from 'path';

import { TTLCache } from '../../../utils/ttlCache';

import { JourneyConfig } from './schema';

export class TemplateUtils {
  private static readonly TEMPLATE_CACHE_TTL_MS =
    process.env.NODE_ENV === 'development' ? 5000 : (undefined as number | undefined);
  private static readonly templatePathCache = new TTLCache<string, string>(TemplateUtils.TEMPLATE_CACHE_TTL_MS);

  static sanitizePathSegment(segment: string): string {
    return segment.replace(/[^a-zA-Z0-9_-]/g, '');
  }

  /**
   * Sanitizes a full template path by filtering every segment through sanitizePathSegment.
   * This prevents path traversal or injection when the template name is dynamic.
   */
  static sanitizeTemplatePath(template: string): string {
    return template
      .split('/')
      .map(seg => this.sanitizePathSegment(seg))
      .filter(Boolean)
      .join('/');
  }

  /**
   * Validates a step ID for use in redirect URLs - internal data used in redirects should be sanitized to prevent XSS attacks
   * @param stepId - The step ID to validate
   * @param journey - The journey configuration
   * @returns The validated step ID or null if invalid
   */
  static validateStepIdForRedirect(stepId: string, journey: JourneyConfig): string | null {
    if (!stepId || typeof stepId !== 'string') {
      return null;
    }

    // Check if the step exists in the journey configuration
    if (!journey.steps[stepId]) {
      return null;
    }

    const sanitizedStepId = this.sanitizePathSegment(stepId);

    // If sanitization changed the step ID, it contained unsafe characters
    if (sanitizedStepId !== stepId) {
      return null;
    }

    return sanitizedStepId;
  }

  static async resolveTemplatePath(stepId: string, slug: string, journey: JourneyConfig): Promise<string> {
    const sanitizedStepId = this.sanitizePathSegment(stepId);
    const cacheKey = `${slug}:${sanitizedStepId}`;
    const cached = TemplateUtils.templatePathCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const step = journey.steps[sanitizedStepId];
    if (!step) {
      return sanitizedStepId;
    }

    // Use explicit template if author provided one
    if (step.template) {
      TemplateUtils.templatePathCache.set(cacheKey, step.template);
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
    const newPath = path.join(slug, 'steps', sanitizedStepId, sanitizedStepId);
    const journeysRoot = path.join(__dirname, '..', '..', '..', 'journeys');
    const newTemplate = path.join(journeysRoot, `${newPath}.njk`);
    if (await checkExists(newTemplate)) {
      TemplateUtils.templatePathCache.set(cacheKey, newPath);
      return newPath;
    }

    // If no journey-specific template found, use default templates
    if (step.type && ['summary', 'confirmation', 'ineligible', 'error', 'complete', 'success'].includes(step.type)) {
      const defaultPath = `_defaults/${step.type}`;
      TemplateUtils.templatePathCache.set(cacheKey, defaultPath);
      return defaultPath;
    }
    // For regular steps with fields, use generic form template
    if (step.fields && Object.keys(step.fields).length > 0) {
      const formPath = '_defaults/form';
      TemplateUtils.templatePathCache.set(cacheKey, formPath);
      return formPath;
    }
    // If no specific template or default found, fall back to regular path
    TemplateUtils.templatePathCache.set(cacheKey, sanitizedStepId);
    return sanitizedStepId;
  }
}
