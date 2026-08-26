import type { ElementId, ModelElement, ModelVersion, VersionId } from '../model/types';

export type ChangeType = 'added' | 'modified' | 'removed';

export interface ChangeSummary {
  added: number;
  modified: number;
  removed: number;
}

// same shape as a Changed Elements API response
export interface ChangedElements {
  fromVersionId: VersionId;
  toVersionId: VersionId;
  changes: Record<ElementId, ChangeType>;
  summary: ChangeSummary;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'undefined';
}

function isSameElement(a: ModelElement, b: ModelElement): boolean {
  return (
    a.name === b.name &&
    a.category === b.category &&
    stableStringify(a.geometry) === stableStringify(b.geometry) &&
    stableStringify(a.properties) === stableStringify(b.properties)
  );
}

export function diffVersions(from: ModelVersion, to: ModelVersion): ChangedElements {
  const fromById = new Map(from.elements.map((element) => [element.id, element]));
  const changes: Record<ElementId, ChangeType> = {};
  const summary: ChangeSummary = { added: 0, modified: 0, removed: 0 };

  for (const element of to.elements) {
    const previous = fromById.get(element.id);
    if (!previous) {
      changes[element.id] = 'added';
      summary.added += 1;
    } else if (!isSameElement(previous, element)) {
      changes[element.id] = 'modified';
      summary.modified += 1;
    }
  }

  const toIds = new Set(to.elements.map((element) => element.id));
  for (const element of from.elements) {
    if (!toIds.has(element.id)) {
      changes[element.id] = 'removed';
      summary.removed += 1;
    }
  }

  return { fromVersionId: from.id, toVersionId: to.id, changes, summary };
}

export function hasChanges(changed: ChangedElements): boolean {
  const { added, modified, removed } = changed.summary;
  return added + modified + removed > 0;
}
