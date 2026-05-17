import type { Request } from 'express';

import { getSectionStatus } from './getSectionStatus';
import type { JourneyFlowConfig, SectionConfig, SectionStatus, StepDefinition } from './types';

/**
 * Computes status for every section in the flow, resolving `dependsOn` in
 * topological order so each section sees the final statuses of its dependencies.
 *
 * Returns a Map<sectionId, status>. Caller renders the task-list from this.
 *
 * Throws if `flowConfig.sections` is undefined — see `getSectionStatus` for the
 * "no sections = wrong flow" rationale.
 */
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
      // Shouldn't happen — topologicalSort only yields IDs from the input.
      continue;
    }
    const status = await getSectionStatus(section, flowConfig, stepRegistry, req, statuses);
    statuses.set(sectionId, status);
  }

  return statuses;
}

/**
 * Kahn's algorithm — yields sections in an order where each section's
 * dependencies appear before it. Cycles + dangling references are caught by
 * `validateSectionConfig` at startup; if one slips through here we fall back
 * to declaration order so the page still renders (downstream getSectionStatus
 * will return NOT_AVAILABLE_YET for any cyclic node since its dependency map
 * entry will be missing).
 */
function topologicalSort(sections: readonly SectionConfig[]): string[] {
  const ids = sections.map(s => s.id);
  const idSet = new Set(ids);
  const inDegree = new Map<string, number>(ids.map(id => [id, 0]));
  const adjacency = new Map<string, string[]>(ids.map(id => [id, []]));

  for (const section of sections) {
    for (const depId of section.dependsOn ?? []) {
      if (!idSet.has(depId)) {
        // Unknown reference — let validateSectionConfig flag it at startup.
        // For runtime safety we skip rather than crash.
        continue;
      }
      adjacency.get(depId)!.push(section.id);
      inDegree.set(section.id, (inDegree.get(section.id) ?? 0) + 1);
    }
  }

  const result: string[] = [];
  // Preserve original declaration order among same-priority nodes.
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

  // Cyclic remainder (shouldn't reach here in a validated config). Append
  // remaining IDs in declaration order so the page still renders.
  if (result.length < ids.length) {
    const unresolved = ids.filter(id => !result.includes(id));
    result.push(...unresolved);
  }

  return result;
}
