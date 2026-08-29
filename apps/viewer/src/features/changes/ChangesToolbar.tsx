import type { ChangeSummary, ChangeType } from '@irv/review-core';

interface ChangesToolbarProps {
  enabled: boolean;
  available: boolean; // false for the first version
  summary: ChangeSummary | null;
  compareLabel: string | null;
  onToggle: (enabled: boolean) => void;
}

const CHANGE_TYPES: readonly ChangeType[] = ['added', 'modified', 'removed'];

export function ChangesToolbar({ enabled, available, summary, compareLabel, onToggle }: ChangesToolbarProps) {
  const active = enabled && available;
  return (
    <div className="changes">
      <label
        className={`toggle${available ? '' : ' is-disabled'}`}
        title={available ? `Compare with ${compareLabel ?? 'previous version'}` : 'No previous version to compare with'}
      >
        <input
          type="checkbox"
          data-testid="compare-toggle"
          checked={active}
          disabled={!available}
          onChange={(event) => onToggle(event.target.checked)}
        />
        <span>Compare with previous version</span>
      </label>
      {active && summary && (
        <div className="legend" data-testid="changes-summary" aria-live="polite">
          {CHANGE_TYPES.map((type, index) => (
            <span key={type} className="legend__item">
              {index > 0 && (
                <span className="legend__sep" aria-hidden="true">
                  {' · '}
                </span>
              )}
              <i className={`swatch swatch--${type}`} aria-hidden="true" />
              {summary[type]} {type}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
