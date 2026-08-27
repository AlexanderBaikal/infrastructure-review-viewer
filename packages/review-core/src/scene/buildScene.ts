import type { ChangedElements, ChangeType } from '../changes/diffVersions';
import type { Category, ElementGeometry, ElementId, ModelElement } from '../model/types';

export interface SceneElement {
  id: ElementId;
  name: string;
  geometry: ElementGeometry;
  color: string; // css colour
  alpha: number;
  outlineColor: string;
  ghost: boolean; // removed in this version, drawn translucent
  selected: boolean;
  marker?: 'issue';
}

export interface SceneOptions {
  selectedId: ElementId | null;
  showChanges: boolean;
  changes: ChangedElements | null;
  previousElements: readonly ModelElement[]; // for the ghosts
  openIssueElementIds: ReadonlySet<ElementId>;
}

export const CATEGORY_COLORS: Record<Category, string> = {
  Abutment: '#9aa4b1',
  Pier: '#aab4c0',
  Deck: '#7f93ab',
  Girder: '#c27a35',
  Utility: '#8c7f72',
  Lighting: '#d4b544',
};

export const CHANGE_COLORS: Record<ChangeType, string> = {
  added: '#22c55e',
  modified: '#f59e0b',
  removed: '#ef4444',
};

export const SELECTION_COLOR = '#06b6d4';
export const SELECTION_OUTLINE_COLOR = '#0e7490';
export const ISSUE_OUTLINE_COLOR = '#ea580c';
export const DEFAULT_OUTLINE_COLOR = '#3a4453';
export const GHOST_ALPHA = 0.35;

// precedence: selection > open issue outline > change colour > category colour
export function buildScene(elements: readonly ModelElement[], options: SceneOptions): SceneElement[] {
  const { selectedId, showChanges, changes, previousElements, openIssueElementIds } = options;
  const changeOf = (id: ElementId): ChangeType | null =>
    showChanges && changes ? (changes.changes[id] ?? null) : null;

  const styled: SceneElement[] = elements.map((element) => style(element, changeOf(element.id), false));

  if (showChanges && changes) {
    for (const element of previousElements) {
      if (changes.changes[element.id] === 'removed') styled.push(style(element, 'removed', true));
    }
  }

  return styled;

  function style(element: ModelElement, change: ChangeType | null, ghost: boolean): SceneElement {
    const selected = element.id === selectedId;
    const hasOpenIssue = openIssueElementIds.has(element.id);
    let color = CATEGORY_COLORS[element.category];
    let outlineColor = DEFAULT_OUTLINE_COLOR;
    if (change) color = CHANGE_COLORS[change];
    if (hasOpenIssue) outlineColor = ISSUE_OUTLINE_COLOR;
    if (selected) {
      color = SELECTION_COLOR;
      outlineColor = SELECTION_OUTLINE_COLOR;
    }
    return {
      id: element.id,
      name: element.name,
      geometry: element.geometry,
      color,
      alpha: ghost ? GHOST_ALPHA : 1,
      outlineColor,
      ghost,
      selected,
      ...(hasOpenIssue ? { marker: 'issue' as const } : {}),
    };
  }
}
