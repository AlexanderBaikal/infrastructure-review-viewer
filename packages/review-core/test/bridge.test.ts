import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { BRIDGE_VERSIONS, MODEL_ID, diffVersions, generateBridge } from '../src/index';

const apiDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../apps/viewer/public/api/models',
  MODEL_ID,
);

describe('generateBridge', () => {
  it('produces the expected element set for v12', () => {
    const v12 = generateBridge('v12');
    expect(v12.elements).toHaveLength(19);
    expect(new Set(v12.elements.map((e) => e.id)).size).toBe(19);
    expect(v12.elements.filter((e) => e.category === 'Girder')).toHaveLength(8);
    expect(v12.elements.some((e) => e.id === 'U-1')).toBe(false);
  });

  it('differs from v11 by exactly 2 added, 2 modified, 1 removed', () => {
    const result = diffVersions(generateBridge('v11'), generateBridge('v12'));
    expect(result.summary).toEqual({ added: 2, modified: 2, removed: 1 });
    expect(result.changes).toEqual({
      'L-1': 'added',
      'L-2': 'added',
      'P-3': 'modified',
      'G-3-R': 'modified',
      'U-1': 'removed',
    });
  });

  it('is deterministic', () => {
    expect(generateBridge('v12')).toEqual(generateBridge('v12'));
  });

  it('matches the committed mock API payloads', async () => {
    const versions = JSON.parse(await readFile(path.join(apiDir, 'versions.json'), 'utf8')) as { versions: unknown };
    expect(versions.versions).toEqual(BRIDGE_VERSIONS);
    for (const versionId of ['v11', 'v12'] as const) {
      const payload = JSON.parse(await readFile(path.join(apiDir, 'versions', `${versionId}.json`), 'utf8')) as unknown;
      expect(payload).toEqual(generateBridge(versionId));
    }
  });
});
