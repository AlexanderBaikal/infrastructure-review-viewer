import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createIssue, type Issue } from '@irv/review-core';
import { describe, expect, it, vi } from 'vitest';
import { IssuePanel } from '../src/features/issues/IssuePanel';

const element = { id: 'P-3', name: 'Pier P-3' };

function makeIssue(id: string, title: string, status: Issue['status'] = 'open'): Issue {
  const result = createIssue(
    { title, description: '', severity: 'medium' },
    {
      element,
      savedView: {
        camera: { position: { x: 0, y: 0, z: 0 }, heading: 0, pitch: 0, roll: 0 },
        selectedElementId: 'P-3',
        versionId: 'v12',
        showChanges: false,
      },
      newId: () => id,
    },
  );
  if (!result.ok) throw new Error('fixture invalid');
  return { ...result.issue, status };
}

const noop = { onSetStatus: vi.fn(), onRestore: vi.fn() };

describe('IssuePanel', () => {
  it('shows a placeholder instead of the form when nothing is selected', () => {
    render(<IssuePanel issues={[]} selectedElement={null} onCreate={vi.fn()} {...noop} />);
    expect(screen.getByTestId('issue-form-placeholder')).toBeInTheDocument();
    expect(screen.queryByRole('form')).toBeNull();
    expect(screen.getByTestId('issues-empty')).toBeInTheDocument();
  });

  it('creating an issue adds it to the list', async () => {
    const user = userEvent.setup();
    const issues: Issue[] = [];
    const onCreate = vi.fn((draft: { title: string }) => {
      issues.push(makeIssue('issue-1', draft.title));
      return null;
    });
    const { rerender } = render(<IssuePanel issues={issues} selectedElement={element} onCreate={onCreate} {...noop} />);
    expect(screen.getByRole('form', { name: 'New issue on Pier P-3' })).toBeInTheDocument();

    await user.type(screen.getByTestId('issue-title'), 'Seat level clash');
    await user.selectOptions(screen.getByTestId('issue-severity'), 'high');
    await user.type(screen.getByTestId('issue-description'), 'Bottom flange interferes.');
    await user.click(screen.getByTestId('create-issue'));

    expect(onCreate).toHaveBeenCalledWith({
      title: 'Seat level clash',
      severity: 'high',
      description: 'Bottom flange interferes.',
    });
    expect(screen.getByTestId('issue-title')).toHaveValue('');

    rerender(<IssuePanel issues={[...issues]} selectedElement={element} onCreate={onCreate} {...noop} />);
    const card = screen.getByTestId('issue-card');
    expect(within(card).getByText('Seat level clash')).toBeInTheDocument();
    expect(screen.getByTestId('issue-filter-open')).toHaveTextContent('1');
  });

  it('surfaces validation errors returned by onCreate', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn(() => [{ field: 'title' as const, message: 'Title is required.' }]);
    render(<IssuePanel issues={[]} selectedElement={element} onCreate={onCreate} {...noop} />);
    await user.click(screen.getByTestId('create-issue'));
    expect(screen.getByRole('alert')).toHaveTextContent('Title is required.');
    expect(screen.getByTestId('issue-title')).toHaveAttribute('aria-invalid', 'true');
  });

  it('restores a saved view and toggles status from a card', async () => {
    const user = userEvent.setup();
    const issue = makeIssue('issue-1', 'Check bearing');
    const onRestore = vi.fn();
    const onSetStatus = vi.fn();
    render(
      <IssuePanel
        issues={[issue]}
        selectedElement={null}
        onCreate={vi.fn()}
        onRestore={onRestore}
        onSetStatus={onSetStatus}
      />,
    );
    await user.click(screen.getByTestId('issue-restore'));
    expect(onRestore).toHaveBeenCalledWith(issue);
    await user.click(screen.getByRole('button', { name: 'Resolve' }));
    expect(onSetStatus).toHaveBeenCalledWith('issue-1', 'resolved');
  });

  it('filters issues by status', async () => {
    const user = userEvent.setup();
    const issues = [makeIssue('a', 'Open one'), makeIssue('b', 'Done one', 'resolved')];
    render(<IssuePanel issues={issues} selectedElement={null} onCreate={vi.fn()} {...noop} />);
    expect(screen.getAllByTestId('issue-card')).toHaveLength(2);
    await user.click(screen.getByTestId('issue-filter-resolved'));
    expect(screen.getAllByTestId('issue-card')).toHaveLength(1);
    expect(screen.getByText('Done one')).toBeInTheDocument();
    await user.click(screen.getByTestId('issue-filter-open'));
    expect(screen.getByText('Open one')).toBeInTheDocument();
  });
});
