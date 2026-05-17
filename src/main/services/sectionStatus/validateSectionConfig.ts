import type { JourneyFlowConfig, SectionConfig } from './types';

export class SectionConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SectionConfigError';
  }
}

export function validateSectionConfig(flowConfig: JourneyFlowConfig): void {
  if (!flowConfig.sections) {
    return;
  }

  const sections = flowConfig.sections;
  const journeyLabel = flowConfig.journeyName ?? '(unnamed journey)';

  assertUniqueIds(sections, journeyLabel);
  assertReferencesResolve(sections, journeyLabel);
  assertAcyclic(sections, journeyLabel);
}

function assertUniqueIds(sections: readonly SectionConfig[], journeyLabel: string): void {
  const seen = new Set<string>();
  for (const section of sections) {
    if (seen.has(section.id)) {
      throw new SectionConfigError(`Journey '${journeyLabel}' has duplicate section id '${section.id}'.`);
    }
    seen.add(section.id);
  }
}

function assertReferencesResolve(sections: readonly SectionConfig[], journeyLabel: string): void {
  const ids = new Set(sections.map(s => s.id));
  for (const section of sections) {
    for (const depId of section.dependsOn ?? []) {
      if (depId === section.id) {
        throw new SectionConfigError(`Journey '${journeyLabel}': section '${section.id}' depends on itself.`);
      }
      if (!ids.has(depId)) {
        throw new SectionConfigError(
          `Journey '${journeyLabel}': section '${section.id}' depends on unknown section '${depId}'.`
        );
      }
    }
  }
}

type Colour = 'white' | 'grey' | 'black';

function assertAcyclic(sections: readonly SectionConfig[], journeyLabel: string): void {
  const adjacency = new Map<string, string[]>();
  for (const section of sections) {
    adjacency.set(section.id, [...(section.dependsOn ?? [])]);
  }

  const colour = new Map<string, Colour>();
  for (const id of adjacency.keys()) {
    colour.set(id, 'white');
  }

  for (const id of adjacency.keys()) {
    if (colour.get(id) === 'white') {
      const cycle = visit(id, adjacency, colour, []);
      if (cycle) {
        throw new SectionConfigError(`Journey '${journeyLabel}' has cyclic dependency: ${cycle.join(' → ')}.`);
      }
    }
  }
}

function visit(
  node: string,
  adjacency: Map<string, string[]>,
  colour: Map<string, Colour>,
  path: string[]
): string[] | null {
  colour.set(node, 'grey');
  path.push(node);

  for (const next of adjacency.get(node) ?? []) {
    const nextColour = colour.get(next);
    if (nextColour === 'grey') {
      const cycleStart = path.indexOf(next);
      return [...path.slice(cycleStart), next];
    }
    if (nextColour === 'white') {
      const cycle = visit(next, adjacency, colour, path);
      if (cycle) {
        return cycle;
      }
    }
  }

  path.pop();
  colour.set(node, 'black');
  return null;
}
