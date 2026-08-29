import { useState } from 'react';
import {
  countByStatus,
  type Issue,
  type IssueDraft,
  type IssueStatus,
  type IssueValidationError,
} from '@irv/review-core';
import { CreateIssueForm } from './CreateIssueForm';
import { IssueList } from './IssueList';

type Filter = 'all' | IssueStatus;
const FILTERS: readonly Filter[] = ['all', 'open', 'resolved'];

interface IssuePanelProps {
  issues: readonly Issue[];
  selectedElement: { id: string; name: string } | null;
  onCreate: (draft: IssueDraft) => IssueValidationError[] | null;
  onSetStatus: (id: string, status: IssueStatus) => void;
  onRestore: (issue: Issue) => void;
  persistError?: string | null;
}

export function IssuePanel({
  issues,
  selectedElement,
  onCreate,
  onSetStatus,
  onRestore,
  persistError,
}: IssuePanelProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const counts = countByStatus(issues);
  const visible = filter === 'all' ? issues : issues.filter((issue) => issue.status === filter);

  return (
    <section className="issues" aria-labelledby="issues-heading">
      <header className="panel__header">
        <h2 id="issues-heading" className="panel__title">
          Issues
        </h2>
        <div className="segmented" role="tablist" aria-label="Filter issues">
          {FILTERS.map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={filter === option}
              className={`segmented__btn${filter === option ? ' is-active' : ''}`}
              data-testid={`issue-filter-${option}`}
              onClick={() => setFilter(option)}
            >
              {option === 'all' ? 'All' : option === 'open' ? 'Open' : 'Resolved'}
              <span className="segmented__count">{option === 'all' ? issues.length : counts[option]}</span>
            </button>
          ))}
        </div>
      </header>
      {persistError && (
        <p className="notice notice--warn" role="status">
          {persistError}
        </p>
      )}
      <div className="issues__list">
        <IssueList
          issues={visible}
          emptyMessage={
            filter === 'all'
              ? 'No issues yet. Select an element and describe what needs attention.'
              : `No ${filter} issues.`
          }
          onRestore={onRestore}
          onSetStatus={onSetStatus}
        />
      </div>
      <div className="issues__form">
        {selectedElement ? (
          <CreateIssueForm key={selectedElement.id} element={selectedElement} onCreate={onCreate} />
        ) : (
          <p className="placeholder" data-testid="issue-form-placeholder">
            Select an element to report an issue.
          </p>
        )}
      </div>
    </section>
  );
}
