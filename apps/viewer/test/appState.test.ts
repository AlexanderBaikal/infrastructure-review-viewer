import { describe, expect, it } from 'vitest';
import { appReducer, initialAppState } from '../src/app/appState';

describe('appReducer', () => {
  it('selects and clears elements', () => {
    const selected = appReducer(initialAppState, { type: 'elementSelected', id: 'P-3' });
    expect(selected.selectedElementId).toBe('P-3');
    expect(appReducer(selected, { type: 'elementSelected', id: null }).selectedElementId).toBeNull();
    expect(appReducer(selected, { type: 'elementSelected', id: 'P-3' })).toBe(selected);
  });

  it('keeps or drops the selection when the version changes', () => {
    const selected = appReducer(initialAppState, { type: 'elementSelected', id: 'U-1' });
    expect(appReducer(selected, { type: 'versionChanged', versionId: 'v12', keepSelection: false })).toEqual({
      versionId: 'v12',
      selectedElementId: null,
      showChanges: false,
    });
    expect(
      appReducer(selected, { type: 'versionChanged', versionId: 'v11', keepSelection: true }).selectedElementId,
    ).toBe('U-1');
  });

  it('restores the full context of a saved view', () => {
    const restored = appReducer(initialAppState, {
      type: 'viewRestored',
      view: {
        camera: { position: { x: 0, y: 0, z: 0 }, heading: 0, pitch: 0, roll: 0 },
        selectedElementId: 'G-3-R',
        versionId: 'v11',
        showChanges: true,
      },
    });
    expect(restored).toEqual({ versionId: 'v11', selectedElementId: 'G-3-R', showChanges: true });
  });
});
