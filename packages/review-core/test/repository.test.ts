import { describe, expect, it } from 'vitest';
import {
  ISSUES_STORAGE_KEY,
  InMemoryIssueRepository,
  LocalStorageIssueRepository,
  createIssue,
  type StorageLike,
} from '../src/index';

class FakeStorage implements StorageLike {
  readonly data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

const result = createIssue(
  { title: 'Roundtrip', description: '', severity: 'low' },
  {
    element: { id: 'A-1', name: 'Abutment A-1' },
    savedView: {
      camera: { position: { x: 0, y: 0, z: 0 }, heading: 0, pitch: 0, roll: 0 },
      selectedElementId: 'A-1',
      versionId: 'v12',
      showChanges: true,
    },
    newId: () => 'issue-1',
  },
);
const issue = result.ok ? result.issue : (undefined as never);

describe('LocalStorageIssueRepository', () => {
  it('round-trips issues through storage', () => {
    const storage = new FakeStorage();
    const repo = new LocalStorageIssueRepository(storage);
    repo.save([issue]);
    expect(storage.data.has(ISSUES_STORAGE_KEY)).toBe(true);
    expect(new LocalStorageIssueRepository(storage).load()).toEqual([issue]);
  });

  it('returns an empty list when storage is empty or corrupted', () => {
    const storage = new FakeStorage();
    expect(new LocalStorageIssueRepository(storage).load()).toEqual([]);
    storage.setItem(ISSUES_STORAGE_KEY, '{not json');
    expect(new LocalStorageIssueRepository(storage).load()).toEqual([]);
    storage.setItem(ISSUES_STORAGE_KEY, JSON.stringify({ nope: true }));
    expect(new LocalStorageIssueRepository(storage).load()).toEqual([]);
  });

  it('drops entries that do not look like issues', () => {
    const storage = new FakeStorage();
    storage.setItem(ISSUES_STORAGE_KEY, JSON.stringify([issue, { id: 'broken' }, null]));
    expect(new LocalStorageIssueRepository(storage).load()).toEqual([issue]);
  });

  it('returns an empty list when storage access throws', () => {
    const throwing: StorageLike = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {},
    };
    expect(new LocalStorageIssueRepository(throwing).load()).toEqual([]);
  });
});

describe('InMemoryIssueRepository', () => {
  it('isolates stored data from callers', () => {
    const repo = new InMemoryIssueRepository([issue]);
    const loaded = repo.load();
    loaded[0]!.title = 'mutated';
    expect(repo.load()[0]!.title).toBe('Roundtrip');
  });
});
