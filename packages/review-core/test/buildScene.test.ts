import { describe, expect, it } from 'vitest';
import {
  CATEGORY_COLORS,
  CHANGE_COLORS,
  DEFAULT_OUTLINE_COLOR,
  GHOST_ALPHA,
  ISSUE_OUTLINE_COLOR,
  SELECTION_COLOR,
  SELECTION_OUTLINE_COLOR,
  buildScene,
  diffVersions,
  generateBridge,
  type SceneOptions,
} from '../src/index';

const v11 = generateBridge('v11');
const v12 = generateBridge('v12');
const changes = diffVersions(v11, v12);

const base: SceneOptions = {
  selectedId: null,
  showChanges: false,
  changes,
  previousElements: v11.elements,
  openIssueElementIds: new Set(),
};

const byId = (scene: ReturnType<typeof buildScene>, id: string) => {
  const element = scene.find((e) => e.id === id);
  if (!element) throw new Error(`missing ${id}`);
  return element;
};

describe('buildScene', () => {
  it('uses category colours and no ghosts when changes are hidden', () => {
    const scene = buildScene(v12.elements, base);
    expect(scene).toHaveLength(19);
    expect(byId(scene, 'P-3').color).toBe(CATEGORY_COLORS.Pier);
    expect(byId(scene, 'P-3').outlineColor).toBe(DEFAULT_OUTLINE_COLOR);
    expect(scene.some((e) => e.ghost)).toBe(false);
  });

  it('colours changed elements and adds removed ones as ghosts when comparing', () => {
    const scene = buildScene(v12.elements, { ...base, showChanges: true });
    expect(scene).toHaveLength(20);
    expect(byId(scene, 'L-1').color).toBe(CHANGE_COLORS.added);
    expect(byId(scene, 'P-3').color).toBe(CHANGE_COLORS.modified);
    const ghost = byId(scene, 'U-1');
    expect(ghost.ghost).toBe(true);
    expect(ghost.alpha).toBe(GHOST_ALPHA);
    expect(ghost.color).toBe(CHANGE_COLORS.removed);
    expect(byId(scene, 'D-1').color).toBe(CATEGORY_COLORS.Deck);
  });

  it('lets selection override the change colour', () => {
    const scene = buildScene(v12.elements, { ...base, showChanges: true, selectedId: 'P-3' });
    const pier = byId(scene, 'P-3');
    expect(pier.selected).toBe(true);
    expect(pier.color).toBe(SELECTION_COLOR);
    expect(pier.outlineColor).toBe(SELECTION_OUTLINE_COLOR);
    expect(scene.filter((e) => e.selected)).toHaveLength(1);
  });

  it('outlines and marks elements with open issues', () => {
    const scene = buildScene(v12.elements, { ...base, openIssueElementIds: new Set(['G-3-R']) });
    const girder = byId(scene, 'G-3-R');
    expect(girder.outlineColor).toBe(ISSUE_OUTLINE_COLOR);
    expect(girder.marker).toBe('issue');
    expect(byId(scene, 'G-3-L').marker).toBeUndefined();
  });
});
