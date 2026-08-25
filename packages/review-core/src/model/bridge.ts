import type { ModelElement, ModelVersion, ModelVersionSummary, PropertyValue } from './types';

export const MODEL_ID = 'valley-creek-bridge';

export const BRIDGE_VERSION_IDS = ['v11', 'v12'] as const;
export type BridgeVersionId = (typeof BRIDGE_VERSION_IDS)[number];

const SPAN_LENGTH = 24;
const SPAN_COUNT = 4;
const HALF_LENGTH = (SPAN_LENGTH * SPAN_COUNT) / 2;
const DECK_WIDTH = 10;
const DECK_THICKNESS = 1;
const PIER_HEIGHT = 8;
const GIRDER_DEPTH = 1;
const DECK_TOP = PIER_HEIGHT + GIRDER_DEPTH + DECK_THICKNESS;

export const BRIDGE_VERSIONS: readonly ModelVersionSummary[] = [
  {
    id: 'v11',
    label: 'v11 — Issued for review',
    createdAt: '2026-07-30T09:30:00Z',
    previousVersionId: null,
  },
  {
    id: 'v12',
    label: 'v12 — Revised after review',
    createdAt: '2026-08-18T14:05:00Z',
    previousVersionId: 'v11',
  },
];

function summaryOf(versionId: BridgeVersionId): ModelVersionSummary {
  const summary = BRIDGE_VERSIONS.find((v) => v.id === versionId);
  if (!summary) throw new Error(`Unknown bridge version: ${versionId}`);
  return summary;
}

// v11 -> v12: 2 added (L-1, L-2), 2 modified (P-3, G-3-R), 1 removed (U-1)
export function generateBridge(versionId: BridgeVersionId): ModelVersion {
  const isV12 = versionId === 'v12';
  const elements: ModelElement[] = [];
  const common = (tag: string, status: string, extra: Record<string, PropertyValue>) => ({
    ...extra,
    Status: status,
    'Asset tag': `VCB-${tag}`,
    'Last inspected': '2026-03-14',
  });

  // Abutments at both ends, resting on the ground and carrying the deck.
  for (const [id, x] of [
    ['A-1', -HALF_LENGTH - 2],
    ['A-2', HALF_LENGTH + 2],
  ] as const) {
    elements.push({
      id,
      name: `Abutment ${id}`,
      category: 'Abutment',
      geometry: {
        position: [x, 0, (DECK_TOP - DECK_THICKNESS) / 2],
        dimensions: [4, 12, DECK_TOP - DECK_THICKNESS],
        heading: 0,
      },
      properties: common(id, 'Approved', { Material: 'Reinforced concrete', 'Height (m)': DECK_TOP - DECK_THICKNESS }),
    });
  }

  // Piers between spans. P-3 was raised by 0.4 m in v12 to fix the girder seat level.
  for (let i = 1; i < SPAN_COUNT; i += 1) {
    const id = `P-${i}`;
    const height = !isV12 && i === 3 ? PIER_HEIGHT - 0.4 : PIER_HEIGHT;
    elements.push({
      id,
      name: `Pier ${id}`,
      category: 'Pier',
      geometry: { position: [-HALF_LENGTH + SPAN_LENGTH * i, 0, height / 2], dimensions: [2, 8, height], heading: 0 },
      properties: common(id, isV12 && i === 3 ? 'In review' : 'Approved', {
        Material: 'Reinforced concrete',
        'Height (m)': height,
      }),
    });
  }

  // Deck spans and the pair of girders under each span.
  for (let s = 1; s <= SPAN_COUNT; s += 1) {
    const x = -HALF_LENGTH + SPAN_LENGTH * (s - 0.5);
    const deckId = `D-${s}`;
    elements.push({
      id: deckId,
      name: `Deck span ${deckId}`,
      category: 'Deck',
      geometry: {
        position: [x, 0, DECK_TOP - DECK_THICKNESS / 2],
        dimensions: [SPAN_LENGTH, DECK_WIDTH, DECK_THICKNESS],
        heading: 0,
      },
      properties: common(deckId, 'Approved', {
        Material: 'Precast concrete',
        'Length (m)': SPAN_LENGTH,
        'Width (m)': DECK_WIDTH,
      }),
    });
    for (const side of ['L', 'R'] as const) {
      const id = `G-${s}-${side}`;
      const material = isV12 && id === 'G-3-R' ? 'Weathering steel' : 'Steel';
      elements.push({
        id,
        name: `Girder ${id}`,
        category: 'Girder',
        geometry: {
          position: [x, side === 'L' ? 3 : -3, PIER_HEIGHT + GIRDER_DEPTH / 2],
          dimensions: [SPAN_LENGTH - 0.4, 0.8, GIRDER_DEPTH],
          heading: 0,
        },
        properties: common(id, 'Approved', {
          Material: material,
          'Length (m)': SPAN_LENGTH - 0.4,
          Section: 'W920x238',
        }),
      });
    }
  }

  // Utility duct under the deck existed only in v11 (rerouted off-structure in v12).
  if (!isV12) {
    elements.push({
      id: 'U-1',
      name: 'Utility duct U-1',
      category: 'Utility',
      geometry: {
        position: [0, 0, PIER_HEIGHT + GIRDER_DEPTH / 2],
        dimensions: [HALF_LENGTH * 2 - 8, 0.6, 0.6],
        heading: 0,
      },
      properties: common('U-1', 'Superseded', { Material: 'HDPE', 'Diameter (mm)': 400 }),
    });
  }

  // Lighting columns were added on the north edge of the deck in v12.
  if (isV12) {
    for (const [id, x] of [
      ['L-1', -12],
      ['L-2', 12],
    ] as const) {
      elements.push({
        id,
        name: `Lighting column ${id}`,
        category: 'Lighting',
        geometry: { position: [x, DECK_WIDTH / 2 + 0.5, DECK_TOP + 4], dimensions: [0.4, 0.4, 8], heading: 0 },
        properties: common(id, 'In review', { Material: 'Galvanised steel', 'Height (m)': 8, Luminaire: 'LED 120 W' }),
      });
    }
  }

  return { ...summaryOf(versionId), elements };
}
