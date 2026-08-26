import { SEVERITIES, type Issue } from './types';

// persistence boundary; a real deployment would put the Issues API behind this
export interface IssueRepository {
  load(): Issue[];
  save(issues: readonly Issue[]): void;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const ISSUES_STORAGE_KEY = 'irv.issues.v1';

function isIssueLike(value: unknown): value is Issue {
  if (!value || typeof value !== 'object') return false;
  const issue = value as Record<string, unknown>;
  return (
    typeof issue['id'] === 'string' &&
    typeof issue['elementId'] === 'string' &&
    typeof issue['elementName'] === 'string' &&
    typeof issue['title'] === 'string' &&
    typeof issue['description'] === 'string' &&
    SEVERITIES.includes(issue['severity'] as Issue['severity']) &&
    (issue['status'] === 'open' || issue['status'] === 'resolved') &&
    typeof issue['createdAt'] === 'string' &&
    typeof issue['savedView'] === 'object' &&
    issue['savedView'] !== null
  );
}

// malformed data -> empty list, never throw on load
export class LocalStorageIssueRepository implements IssueRepository {
  constructor(
    private readonly storage: StorageLike,
    private readonly key: string = ISSUES_STORAGE_KEY,
  ) {}

  load(): Issue[] {
    let raw: string | null;
    try {
      raw = this.storage.getItem(this.key);
    } catch {
      return [];
    }
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(isIssueLike) : [];
    } catch {
      return [];
    }
  }

  // may throw (quota, private mode) - the hook deals with it
  save(issues: readonly Issue[]): void {
    this.storage.setItem(this.key, JSON.stringify(issues));
  }
}

export class InMemoryIssueRepository implements IssueRepository {
  private issues: Issue[];

  constructor(initial: readonly Issue[] = []) {
    this.issues = structuredClone([...initial]);
  }

  load(): Issue[] {
    return structuredClone(this.issues);
  }

  save(issues: readonly Issue[]): void {
    this.issues = structuredClone([...issues]);
  }
}
