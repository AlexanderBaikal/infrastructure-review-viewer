import type { Issue, IssueStatus } from '@irv/review-core';
import { formatDate } from '../properties/format';

interface IssueListProps {
  issues: readonly Issue[];
  emptyMessage: string;
  onRestore: (issue: Issue) => void;
  onSetStatus: (id: string, status: IssueStatus) => void;
}

export function IssueList({ issues, emptyMessage, onRestore, onSetStatus }: IssueListProps) {
  if (issues.length === 0) {
    return (
      <p className="placeholder" data-testid="issues-empty">
        {emptyMessage}
      </p>
    );
  }
  return (
    <ul className="issue-list">
      {issues.map((issue) => (
        <li
          key={issue.id}
          className={`issue-card issue-card--${issue.status}`}
          data-testid="issue-card"
          data-status={issue.status}
        >
          <button
            type="button"
            className="issue-card__body"
            data-testid="issue-restore"
            onClick={() => onRestore(issue)}
            title="Open the saved view for this issue"
          >
            <span className="issue-card__title">{issue.title}</span>
            <span className="issue-card__meta">
              <span className={`chip chip--${issue.severity}`}>{issue.severity}</span>
              <span>{issue.elementName}</span>
              <span>{issue.savedView.versionId}</span>
              <time dateTime={issue.createdAt}>{formatDate(issue.createdAt)}</time>
            </span>
            {issue.description && <span className="issue-card__desc">{issue.description}</span>}
          </button>
          <button
            type="button"
            className="btn btn--ghost issue-card__status"
            data-testid="issue-status-toggle"
            onClick={() => onSetStatus(issue.id, issue.status === 'open' ? 'resolved' : 'open')}
          >
            {issue.status === 'open' ? 'Resolve' : 'Reopen'}
          </button>
        </li>
      ))}
    </ul>
  );
}
