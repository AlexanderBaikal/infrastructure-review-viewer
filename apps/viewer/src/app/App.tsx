import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  buildScene,
  countByStatus,
  diffVersions,
  openIssueElementIds,
  type CameraState,
  type ElementId,
  type Issue,
  type IssueDraft,
  type IssueRepository,
  type IssueValidationError,
  type ModelApiClient,
  type ModelElement,
  type ModelVersion,
  type SceneElement,
  type VersionId,
} from '@irv/review-core';
import { ChangesToolbar } from '../features/changes/ChangesToolbar';
import { IssuePanel } from '../features/issues/IssuePanel';
import { useIssues } from '../features/issues/useIssues';
import { ModelTree, type TreeItem } from '../features/model-tree/ModelTree';
import { StatusBar } from '../features/properties/StatusBar';
import { ViewerCanvas } from '../viewer/ViewerCanvas';
import type { ViewerAdapter } from '../viewer/ViewerAdapter';
import { appReducer, initialAppState } from './appState';
import { useModelData } from './useModelData';

export interface AppProps {
  api: ModelApiClient;
  issueRepository: IssueRepository;
  adapter: ViewerAdapter;
}

const NO_MODELS: Record<VersionId, ModelVersion> = {};
const NO_ELEMENTS: readonly ModelElement[] = [];
const NO_SCENE: readonly SceneElement[] = [];

export function App({ api, issueRepository, adapter }: AppProps) {
  const data = useModelData(api);
  const [state, dispatch] = useReducer(appReducer, initialAppState);
  const { issues, create, setStatus, persistError } = useIssues(issueRepository);
  const [camera, setCamera] = useState<CameraState | null>(null);
  const [cameraBusy, setCameraBusy] = useState(false);
  const flightsInProgress = useRef(0);

  const versions = data.status === 'ready' ? data.versions : [];
  const modelsById = data.status === 'ready' ? data.modelsById : NO_MODELS;
  const latestVersionId = versions.length > 0 ? versions[versions.length - 1]!.id : null;
  const versionId = state.versionId && modelsById[state.versionId] ? state.versionId : latestVersionId;
  const current = versionId ? modelsById[versionId] : undefined;
  const previous = current?.previousVersionId ? modelsById[current.previousVersionId] : undefined;
  const previousElements = previous?.elements ?? NO_ELEMENTS;

  const changes = useMemo(() => (current && previous ? diffVersions(previous, current) : null), [current, previous]);
  const showChanges = state.showChanges && changes !== null;
  const openIds = useMemo(() => openIssueElementIds(issues), [issues]);

  const scene = useMemo(
    () =>
      current
        ? buildScene(current.elements, {
            selectedId: state.selectedElementId,
            showChanges,
            changes,
            previousElements,
            openIssueElementIds: openIds,
          })
        : NO_SCENE,
    [current, state.selectedElementId, showChanges, changes, previousElements, openIds],
  );

  const treeItems = useMemo<TreeItem[]>(() => {
    if (!current) return [];
    const items: TreeItem[] = current.elements.map((element) => ({
      element,
      change: showChanges && changes ? (changes.changes[element.id] ?? null) : null,
      hasOpenIssue: openIds.has(element.id),
      ghost: false,
    }));
    if (showChanges && changes) {
      for (const element of previousElements) {
        if (changes.changes[element.id] === 'removed') {
          items.push({ element, change: 'removed', hasOpenIssue: openIds.has(element.id), ghost: true });
        }
      }
    }
    return items;
  }, [current, showChanges, changes, previousElements, openIds]);

  const selectedItem = treeItems.find((item) => item.element.id === state.selectedElementId) ?? null;
  const openCount = countByStatus(issues).open;

  const handleSelect = useCallback((id: ElementId | null) => dispatch({ type: 'elementSelected', id }), []);

  // lets the UI (and e2e) know when a camera flight has settled
  const trackFlight = useCallback((flight: Promise<void>) => {
    flightsInProgress.current += 1;
    setCameraBusy(true);
    void flight.finally(() => {
      flightsInProgress.current -= 1;
      if (flightsInProgress.current === 0) setCameraBusy(false);
    });
  }, []);
  const handleCameraChanged = useCallback((next: CameraState) => setCamera(next), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dispatch({ type: 'elementSelected', id: null });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleVersionChange = (nextVersionId: VersionId) => {
    const target = modelsById[nextVersionId];
    const keepSelection =
      state.selectedElementId !== null &&
      (target?.elements.some((element) => element.id === state.selectedElementId) ?? false);
    dispatch({ type: 'versionChanged', versionId: nextVersionId, keepSelection });
  };

  const handleToggleChanges = (show: boolean) => {
    dispatch({ type: 'changesToggled', show });
    if (!show && selectedItem?.ghost) dispatch({ type: 'elementSelected', id: null });
  };

  const handleCreateIssue = (draft: IssueDraft): IssueValidationError[] | null => {
    if (!selectedItem || !versionId) return [{ field: 'title', message: 'Select an element first.' }];
    const result = create(draft, {
      element: selectedItem.element,
      savedView: {
        camera: adapter.getCamera(),
        selectedElementId: selectedItem.element.id,
        versionId,
        showChanges,
      },
    });
    return result.ok ? null : result.errors;
  };

  const handleRestore = (issue: Issue) => {
    const view = issue.savedView;
    if (modelsById[view.versionId]) dispatch({ type: 'viewRestored', view });
    else dispatch({ type: 'elementSelected', id: view.selectedElementId });
    trackFlight(adapter.setCamera(view.camera, { animate: true }));
  };

  const handleZoom = () => {
    if (state.selectedElementId) trackFlight(adapter.zoomTo(state.selectedElementId));
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true" />
          <div>
            <h1 className="brand__title">Infrastructure Review Viewer</h1>
            <p className="brand__subtitle">Valley Creek Bridge · Design review</p>
          </div>
        </div>
        <div className="topbar__controls">
          <label className="field field--inline">
            <span>Version</span>
            <select
              data-testid="version-select"
              value={versionId ?? ''}
              disabled={versions.length === 0}
              onChange={(event) => handleVersionChange(event.target.value)}
            >
              {versions.map((version) => (
                <option key={version.id} value={version.id}>
                  {version.label}
                </option>
              ))}
            </select>
          </label>
          <ChangesToolbar
            enabled={state.showChanges}
            available={changes !== null}
            summary={changes?.summary ?? null}
            compareLabel={previous?.label ?? null}
            onToggle={handleToggleChanges}
          />
          <span className="badge badge--open" data-testid="open-count">
            {openCount} open
          </span>
        </div>
      </header>

      <aside className="panel panel--tree" aria-label="Model">
        <header className="panel__header">
          <h2 className="panel__title">Model</h2>
          {current && <span className="panel__meta">{treeItems.length} elements</span>}
        </header>
        {data.status === 'loading' && (
          <p className="placeholder" role="status">
            Loading model…
          </p>
        )}
        {data.status === 'error' && (
          <p className="notice notice--error" role="alert">
            Could not load the model: {data.message}
          </p>
        )}
        {current && <ModelTree items={treeItems} selectedId={state.selectedElementId} onSelect={handleSelect} />}
      </aside>

      <main className="stage">
        <ViewerCanvas adapter={adapter} scene={scene} onPick={handleSelect} onCameraChanged={handleCameraChanged}>
          <div className="viewer__toolbar">
            <button
              type="button"
              className="btn"
              data-testid="zoom-to-selected"
              disabled={!selectedItem}
              onClick={handleZoom}
            >
              Zoom to selected
            </button>
            <button
              type="button"
              className="btn"
              data-testid="reset-view"
              onClick={() => trackFlight(adapter.resetView())}
            >
              Reset view
            </button>
          </div>
        </ViewerCanvas>
      </main>

      <aside className="panel panel--issues" aria-label="Issues">
        <IssuePanel
          issues={issues}
          selectedElement={selectedItem ? { id: selectedItem.element.id, name: selectedItem.element.name } : null}
          onCreate={handleCreateIssue}
          onSetStatus={setStatus}
          onRestore={handleRestore}
          persistError={persistError}
        />
      </aside>

      <StatusBar item={selectedItem} camera={camera} cameraBusy={cameraBusy} versionLabel={current?.label ?? null} />
    </div>
  );
}
