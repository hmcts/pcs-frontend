import type { Request } from 'express';

import type { SectionConfig } from '../../interfaces/stepFlow.interface';

type SectionsMap = Record<string, SectionConfig>;

export function getSectionForStep(stepSlug: string, sections: SectionsMap): string | null {
  for (const [sectionId, section] of Object.entries(sections)) {
    if (section.steps.includes(stepSlug)) {
      return sectionId;
    }
  }
  return null;
}

export function getStepsInSection(sectionId: string, sections: SectionsMap): string[] {
  return sections[sectionId]?.steps ?? [];
}

/**
 * First slug in the section config `steps` array — config order, not necessarily the first step
 * a user reaches in the journey for that section. Use for stable task-list entry when that matches
 * product intent; otherwise resolve entry from flow routing.
 */
export function getFirstStepInSection(sectionId: string, sections: SectionsMap): string | null {
  return sections[sectionId]?.steps[0] ?? null;
}

export async function isSectionApplicable(sectionId: string, sections: SectionsMap, req: Request): Promise<boolean> {
  const section = sections[sectionId];
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
export function isLastStepInSection(
  currentStepSlug: string,
  nextStepSlug: string | null,
  sections: SectionsMap
): boolean {
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
  sections: SectionsMap
): {
  unmappedSteps: string[];
  duplicateAssignments: string[];
} {
  const stepToSectionCount = new Map<string, number>();
  for (const section of Object.values(sections)) {
    for (const step of section.steps) {
      stepToSectionCount.set(step, (stepToSectionCount.get(step) ?? 0) + 1);
    }
  }

  const unmappedSteps = stepSlugs.filter(step => !stepToSectionCount.has(step));
  const duplicateAssignments = [...stepToSectionCount.entries()].filter(([, count]) => count > 1).map(([step]) => step);

  return { unmappedSteps, duplicateAssignments };
}
