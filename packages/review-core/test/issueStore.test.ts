import { describe, expect, it } from 'vitest';
import {
  countByStatus,
  createIssue,
  issuesReducer,
  openIssueElementIds,
  validateIssueDraft,
  type Issue,
  type SavedView,
} from '../src/index';

const savedView: SavedView = {
  camera: { position: { x: 10, y: -20, z: 30 }, heading: 0.5, pitch: -0.4, roll: 0 },
  selectedElementId: 'P-3',
  versionId: 'v12',
  showChanges: false,
};

const context = {
  element: { id: 'P-3', name: 'Pier P-3' },
  savedView,
  now: () => new Date('2026-09-10T10:00:00Z'),
  newId: () => 'issue-1',
};

describe('createIssue', () => {
  it('creates an open issue bound to the element and the saved view', () => {
    const result = createIssue(
      { title: '  Seat level clash ', description: 'Girder seat 40 mm low ', severity: 'high' },
      context,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.issue).toEqual<Issue>({
      id: 'issue-1',
      elementId: 'P-3',
      elementName: 'Pier P-3',
      title: 'Seat level clash',
      description: 'Girder seat 40 mm low',
      severity: 'high',
      status: 'open',
      createdAt: '2026-09-10T10:00:00.000Z',
      savedView,
    });
    expect(result.issue.savedView).not.toBe(savedView);
  });

  it('rejects an empty title', () => {
    const result = createIssue({ title: '   ', description: '', severity: 'low' }, context);
    expect(result).toEqual({ ok: false, errors: [{ field: 'title', message: 'Title is required.' }] });
  });

  it('rejects an overly long title and an unknown severity', () => {
    const errors = validateIssueDraft({ title: 'x'.repeat(121), description: '', severity: 'urgent' as never });
    expect(errors.map((e) => e.field)).toEqual(['title', 'severity']);
  });
});

describe('issuesReducer', () => {
  const base = createIssue({ title: 'One', description: '', severity: 'medium' }, context);
  const issue = base.ok ? base.issue : (undefined as never);

  it('prepends created issues and toggles status', () => {
    let state = issuesReducer([], { type: 'created', issue });
    state = issuesReducer(state, { type: 'created', issue: { ...issue, id: 'issue-2' } });
    expect(state.map((i) => i.id)).toEqual(['issue-2', 'issue-1']);

    state = issuesReducer(state, { type: 'statusChanged', id: 'issue-1', status: 'resolved' });
    expect(countByStatus(state)).toEqual({ open: 1, resolved: 1 });
    expect([...openIssueElementIds(state)]).toEqual(['P-3']);

    state = issuesReducer(state, { type: 'statusChanged', id: 'issue-1', status: 'open' });
    expect(countByStatus(state)).toEqual({ open: 2, resolved: 0 });

    state = issuesReducer(state, { type: 'deleted', id: 'issue-2' });
    expect(state.map((i) => i.id)).toEqual(['issue-1']);
  });

  it('replaces state on hydration', () => {
    expect(issuesReducer([issue], { type: 'hydrated', issues: [] })).toEqual([]);
  });
});
