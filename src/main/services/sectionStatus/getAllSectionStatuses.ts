import type { Request } from 'express';

import { getSectionStatus } from './getSectionStatus';
import type { JourneyFlowConfig, SectionConfig, SectionStatus, StepDefinition } from './types';

export async function getAllSectionStatuses(
  flowConfig: JourneyFlowConfig,
  stepRegistry: Record<string, StepDefinition>,
  req: Request
): Promise<Map<string, SectionStatus>> {
  if (!flowConfig.sections) {
    throw new Error(
      'getAllSectionStatuses called with a flowConfig that has no sections. ' +
        'Section status is only meaningful for sectionalised journeys. ' +
        `Flow: ${flowConfig.journeyName ?? '(unnamed)'}.`
    );
  }

  const orderedIds = topologicalSort(flowConfig.sections);
  const sectionById = new Map(flowConfig.sections.map(s => [s.id, s]));
  const statuses = new Map<string, SectionStatus>();

  for (const sectionId of orderedIds) {
    const section = sectionById.get(sectionId);
    if (!section) {
      continue;
    }
    const status = await getSectionStatus(section, flowConfig, stepRegistry, req, statuses);
    statuses.set(sectionId, status);
  }

  return statuses;
}

// Kahn's algorithm. validateSectionConfig catches cycles + dangling refs at startup;
// any remainder here falls back to declaration order so the page still renders.
function topologicalSort(sections: readonly SectionConfig[]): string[] {
  const ids = sections.map(s => s.id);
  const idSet = new Set(ids);
  const inDegree = new Map<string, number>(ids.map(id => [id, 0]));
  const adjacency = new Map<string, string[]>(ids.map(id => [id, []]));

  for (const section of sections) {
    for (const depId of section.dependsOn ?? []) {
      if (!idSet.has(depId)) {
        continue;
      }
      adjacency.get(depId)!.push(section.id);
      inDegree.set(section.id, (inDegree.get(section.id) ?? 0) + 1);
    }
  }

  const result: string[] = [];
  const ready = ids.filter(id => inDegree.get(id) === 0);

  while (ready.length > 0) {
    const nextId = ready.shift()!;
    result.push(nextId);
    for (const dependentId of adjacency.get(nextId) ?? []) {
      const newDegree = (inDegree.get(dependentId) ?? 0) - 1;
      inDegree.set(dependentId, newDegree);
      if (newDegree === 0) {
        ready.push(dependentId);
      }
    }
  }

  if (result.length < ids.length) {
    const unresolved = ids.filter(id => !result.includes(id));
    result.push(...unresolved);
  }

  return result;
}
