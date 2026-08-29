import { useCallback, useEffect, useReducer, useState } from 'react';
import {
  createIssue,
  issuesReducer,
  type CreateIssueResult,
  type IssueContext,
  type IssueDraft,
  type IssueRepository,
  type IssueStatus,
} from '@irv/review-core';

export function useIssues(repository: IssueRepository) {
  const [issues, dispatch] = useReducer(issuesReducer, repository, (repo) => repo.load());
  const [persistError, setPersistError] = useState<string | null>(null);

  useEffect(() => {
    try {
      repository.save(issues);
      setPersistError(null);
    } catch {
      setPersistError('Issues cannot be saved in this browser and will be lost on reload.');
    }
  }, [issues, repository]);

  const create = useCallback((draft: IssueDraft, context: IssueContext): CreateIssueResult => {
    const result = createIssue(draft, context);
    if (result.ok) dispatch({ type: 'created', issue: result.issue });
    return result;
  }, []);

  const setStatus = useCallback((id: string, status: IssueStatus) => {
    dispatch({ type: 'statusChanged', id, status });
  }, []);

  return { issues, create, setStatus, persistError };
}
