import type { ElementId, SavedView, VersionId } from '@irv/review-core';

export interface AppState {
  versionId: VersionId | null;
  selectedElementId: ElementId | null;
  showChanges: boolean;
}

export const initialAppState: AppState = {
  versionId: null,
  selectedElementId: null,
  showChanges: false,
};

export type AppAction =
  | { type: 'elementSelected'; id: ElementId | null }
  | { type: 'versionChanged'; versionId: VersionId; keepSelection: boolean }
  | { type: 'changesToggled'; show: boolean }
  | { type: 'viewRestored'; view: SavedView };

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'elementSelected':
      return state.selectedElementId === action.id ? state : { ...state, selectedElementId: action.id };
    case 'versionChanged':
      return {
        ...state,
        versionId: action.versionId,
        selectedElementId: action.keepSelection ? state.selectedElementId : null,
      };
    case 'changesToggled':
      return { ...state, showChanges: action.show };
    case 'viewRestored':
      return {
        versionId: action.view.versionId,
        selectedElementId: action.view.selectedElementId,
        showChanges: action.view.showChanges,
      };
  }
}
