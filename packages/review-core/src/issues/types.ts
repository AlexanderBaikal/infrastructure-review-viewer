import type { ElementId, SavedView } from '../model/types';

export type Severity = 'low' | 'medium' | 'high';
export type IssueStatus = 'open' | 'resolved';

export const SEVERITIES: readonly Severity[] = ['low', 'medium', 'high'];

export interface IssueDraft {
  title: string;
  description: string;
  severity: Severity;
}

export interface Issue extends IssueDraft {
  id: string;
  elementId: ElementId;
  elementName: string;
  status: IssueStatus;
  createdAt: string;
  savedView: SavedView;
}
