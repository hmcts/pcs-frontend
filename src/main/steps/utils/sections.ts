import type { Request } from 'express';

import type { SectionConfig } from '../../modules/steps/stepFlow.interface';

type Sections = SectionConfig[];

export function getSectionForStep(stepSlug: string, sections: Sections): string | null {
  return sections.find(section => section.steps.includes(stepSlug))?.id ?? null;
}

export function getStepsInSection(sectionId: string, sections: Sections): string[] {
  return sections.find(section => section.id === sectionId)?.steps ?? [];
}

/**
 * First slug in the section config `steps` array — config order, not necessarily the first step
 * a user reaches in the journey for that section. Use for stable task-list entry when that matches
 * product intent; otherwise resolve entry from flow routing.
 */
export function getFirstStepInSection(sectionId: string, sections: Sections): string | null {
  return sections.find(section => section.id === sectionId)?.steps[0] ?? null;
}

export async function isSectionApplicable(sectionId: string, sections: Sections, req: Request): Promise<boolean> {
  const section = sections.find(s => s.id === sectionId);
  if (!section) {
    return false;
  }
  if (!section.isApplicable) {
    return true;
  }
  return section.isApplicable(req);
}

/**
 * True when moving from `currentStepSlug` would leave the current section.
 * - `nextStepSlug` null: treated as end of flow (last step).
 * - Next step not present in any section: treated as leaving the section if the current step is
 *   section-mapped (e.g. terminal routes like `end-now` that are omitted from section metadata).
 * - If the current step is not in any section, returns false (no section boundary to detect).
 */
export function isLastStepInSection(currentStepSlug: string, nextStepSlug: string | null, sections: Sections): boolean {
  if (!nextStepSlug) {
    return true;
  }

  const currentSection = getSectionForStep(currentStepSlug, sections);
  const nextSection = getSectionForStep(nextStepSlug, sections);

  if (currentSection && !nextSection) {
    return true;
  }

  return Boolean(currentSection && nextSection && currentSection !== nextSection);
}

export function getSectionCoverage(
  stepSlugs: string[],
  sections: Sections
): {
  unmappedSteps: string[];
  duplicateAssignments: string[];
} {
  const stepToSectionCount = new Map<string, number>();
  for (const section of sections) {
    for (const step of section.steps) {
      stepToSectionCount.set(step, (stepToSectionCount.get(step) ?? 0) + 1);
    }
  }

  const unmappedSteps = stepSlugs.filter(step => !stepToSectionCount.has(step));
  const duplicateAssignments = [...stepToSectionCount.entries()].filter(([, count]) => count > 1).map(([step]) => step);

  return { unmappedSteps, duplicateAssignments };
}
