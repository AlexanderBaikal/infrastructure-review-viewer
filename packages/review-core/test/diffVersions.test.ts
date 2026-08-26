import { describe, expect, it } from 'vitest';
import { diffVersions, hasChanges, type ModelElement, type ModelVersion } from '../src/index';

function element(id: string, overrides: Partial<ModelElement> = {}): ModelElement {
  return {
    id,
    name: `Element ${id}`,
    category: 'Pier',
    geometry: { position: [0, 0, 0], dimensions: [1, 1, 1], heading: 0 },
    properties: { Material: 'Concrete' },
    ...overrides,
  };
}

function version(id: string, elements: ModelElement[]): ModelVersion {
  return { id, label: id, createdAt: '2026-01-01T00:00:00Z', previousVersionId: null, elements };
}

describe('diffVersions', () => {
  it('reports no changes for identical versions', () => {
    const a = version('a', [element('1'), element('2')]);
    const b = version('b', [element('1'), element('2')]);
    const result = diffVersions(a, b);
    expect(result.changes).toEqual({});
    expect(result.summary).toEqual({ added: 0, modified: 0, removed: 0 });
    expect(hasChanges(result)).toBe(false);
  });

  it('classifies added, modified and removed elements', () => {
    const from = version('v1', [element('keep'), element('mod'), element('gone')]);
    const to = version('v2', [element('keep'), element('mod', { properties: { Material: 'Steel' } }), element('new')]);
    const result = diffVersions(from, to);
    expect(result.fromVersionId).toBe('v1');
    expect(result.toVersionId).toBe('v2');
    expect(result.changes).toEqual({ mod: 'modified', new: 'added', gone: 'removed' });
    expect(result.summary).toEqual({ added: 1, modified: 1, removed: 1 });
  });

  it('treats a geometry change as a modification', () => {
    const from = version('v1', [element('p')]);
    const to = version('v2', [
      element('p', { geometry: { position: [0, 0, 0.4], dimensions: [1, 1, 1], heading: 0 } }),
    ]);
    expect(diffVersions(from, to).changes).toEqual({ p: 'modified' });
  });

  it('ignores property key order', () => {
    const from = version('v1', [element('p', { properties: { A: 1, B: 2 } })]);
    const to = version('v2', [element('p', { properties: { B: 2, A: 1 } })]);
    expect(diffVersions(from, to).changes).toEqual({});
  });
});
