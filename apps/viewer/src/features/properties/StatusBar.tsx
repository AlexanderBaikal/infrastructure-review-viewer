import type { CameraState } from '@irv/review-core';
import type { TreeItem } from '../model-tree/ModelTree';
import { formatCamera } from './format';

interface StatusBarProps {
  item: TreeItem | null;
  camera: CameraState | null;
  cameraBusy: boolean;
  versionLabel: string | null;
}

export function StatusBar({ item, camera, cameraBusy, versionLabel }: StatusBarProps) {
  return (
    <footer className="statusbar" aria-label="Properties">
      <div className="statusbar__selection">
        {item ? (
          <>
            <span className="statusbar__category">{item.element.category}</span>
            <strong className="statusbar__name" data-testid="selected-element">
              {item.element.name}
            </strong>
            {item.change && (
              <span className={`badge badge--${item.change}`}>
                {item.change}
                {item.ghost ? ' in this version' : ''}
              </span>
            )}
            <dl className="props" data-testid="element-properties">
              {Object.entries(item.element.properties).map(([key, value]) => (
                <div key={key} className="props__item">
                  <dt>{key}</dt>
                  <dd>{String(value)}</dd>
                </div>
              ))}
            </dl>
          </>
        ) : (
          <span className="statusbar__hint">
            Select an element in the model tree or click it in the 3D view. Esc clears the selection.
          </span>
        )}
      </div>
      <div className="statusbar__camera">
        {versionLabel && <span className="statusbar__version">{versionLabel}</span>}
        <span className="statusbar__readout" data-testid="camera-readout" data-busy={cameraBusy}>
          {camera ? formatCamera(camera) : 'camera —'}
        </span>
      </div>
    </footer>
  );
}
