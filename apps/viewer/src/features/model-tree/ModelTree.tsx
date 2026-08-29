import type { KeyboardEvent } from 'react';
import { CATEGORY_ORDER, type ChangeType, type ElementId, type ModelElement } from '@irv/review-core';

export interface TreeItem {
  element: ModelElement;
  change: ChangeType | null;
  hasOpenIssue: boolean;
  ghost: boolean; // only exists in the previous version
}

interface ModelTreeProps {
  items: readonly TreeItem[];
  selectedId: ElementId | null;
  onSelect: (id: ElementId) => void;
}

// keyboard works too - e2e drives selection through the tree, not the canvas
export function ModelTree({ items, selectedId, onSelect }: ModelTreeProps) {
  const groups = CATEGORY_ORDER.map((category) => ({
    category,
    items: items.filter((item) => item.element.category === category),
  })).filter((group) => group.items.length > 0);

  const onKeyDown = (event: KeyboardEvent<HTMLLIElement>, id: ElementId) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(id);
    }
  };

  return (
    <ul className="tree" role="tree" aria-label="Model tree">
      {groups.map((group) => (
        <li key={group.category} role="none" className="tree__group">
          <div className="tree__heading" id={`tree-group-${group.category}`}>
            <span>{group.category}</span>
            <span className="tree__count">{group.items.length}</span>
          </div>
          <ul role="group" aria-labelledby={`tree-group-${group.category}`} className="tree__items">
            {group.items.map(({ element, change, hasOpenIssue, ghost }) => {
              const selected = element.id === selectedId;
              return (
                <li
                  key={element.id}
                  role="treeitem"
                  aria-selected={selected}
                  tabIndex={0}
                  data-testid={`tree-item-${element.id}`}
                  className={['tree__item', selected ? 'is-selected' : '', ghost ? 'is-ghost' : ''].join(' ').trim()}
                  onClick={() => onSelect(element.id)}
                  onKeyDown={(event) => onKeyDown(event, element.id)}
                >
                  <span className="tree__label">{element.name}</span>
                  {hasOpenIssue && (
                    <span className="badge badge--issue" title="Has an open issue" aria-label="has an open issue">
                      !
                    </span>
                  )}
                  {change && (
                    <span className={`badge badge--${change}`} data-testid={`change-badge-${element.id}`}>
                      {change}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ul>
  );
}
