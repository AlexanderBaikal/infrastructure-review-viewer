import type { SavedView } from '../model/types';
import { SEVERITIES, type Issue, type IssueDraft, type IssueStatus } from './types';

export const ISSUE_TITLE_MAX_LENGTH = 120;

export interface IssueValidationError {
  field: keyof IssueDraft;
  message: string;
}

export function validateIssueDraft(draft: IssueDraft): IssueValidationError[] {
  const errors: IssueValidationError[] = [];
  const title = draft.title.trim();
  if (title.length === 0) errors.push({ field: 'title', message: 'Title is required.' });
  else if (title.length > ISSUE_TITLE_MAX_LENGTH) {
    errors.push({ field: 'title', message: `Title must be at most ${ISSUE_TITLE_MAX_LENGTH} characters.` });
  }
  if (!SEVERITIES.includes(draft.severity)) errors.push({ field: 'severity', message: 'Severity is invalid.' });
  return errors;
}

export interface IssueContext {
  element: { id: string; name: string };
  savedView: SavedView;
  now?: () => Date; // injectable for tests
  newId?: () => string;
}

export type CreateIssueResult = { ok: true; issue: Issue } | { ok: false; errors: IssueValidationError[] };

function defaultId(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') return cryptoApi.randomUUID();
  return `issue-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createIssue(draft: IssueDraft, context: IssueContext): CreateIssueResult {
  const errors = validateIssueDraft(draft);
  if (errors.length > 0) return { ok: false, errors };
  const now = context.now ?? (() => new Date());
  const newId = context.newId ?? defaultId;
  return {
    ok: true,
    issue: {
      id: newId(),
      elementId: context.element.id,
      elementName: context.element.name,
      title: draft.title.trim(),
      description: draft.description.trim(),
      severity: draft.severity,
      status: 'open',
      createdAt: now().toISOString(),
      savedView: structuredClone(context.savedView),
    },
  };
}

export type IssuesAction =
  | { type: 'hydrated'; issues: Issue[] }
  | { type: 'created'; issue: Issue }
  | { type: 'statusChanged'; id: string; status: IssueStatus }
  | { type: 'deleted'; id: string };

export function issuesReducer(state: Issue[], action: IssuesAction): Issue[] {
  switch (action.type) {
    case 'hydrated':
      return action.issues;
    case 'created':
      return [action.issue, ...state];
    case 'statusChanged':
      return state.map((issue) => (issue.id === action.id ? { ...issue, status: action.status } : issue));
    case 'deleted':
      return state.filter((issue) => issue.id !== action.id);
  }
}

export function countByStatus(issues: readonly Issue[]): Record<IssueStatus, number> {
  return issues.reduce(
    (acc, issue) => {
      acc[issue.status] += 1;
      return acc;
    },
    { open: 0, resolved: 0 },
  );
}

export function openIssueElementIds(issues: readonly Issue[]): Set<string> {
  return new Set(issues.filter((issue) => issue.status === 'open').map((issue) => issue.elementId));
}
