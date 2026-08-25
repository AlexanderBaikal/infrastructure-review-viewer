export type ElementId = string;
export type VersionId = string;

export type Category = 'Abutment' | 'Pier' | 'Deck' | 'Girder' | 'Utility' | 'Lighting';

export const CATEGORY_ORDER: readonly Category[] = ['Abutment', 'Pier', 'Deck', 'Girder', 'Utility', 'Lighting'];

// local east-north-up frame, metres; origin = bridge centre at ground level
export interface ElementGeometry {
  position: [x: number, y: number, z: number]; // box centre
  dimensions: [length: number, width: number, height: number];
  heading: number; // radians, clockwise from north
}

export type PropertyValue = string | number;

export interface ModelElement {
  id: ElementId;
  name: string;
  category: Category;
  geometry: ElementGeometry;
  properties: Record<string, PropertyValue>;
}

export interface ModelVersionSummary {
  id: VersionId;
  label: string;
  createdAt: string;
  previousVersionId: VersionId | null;
}

export interface ModelVersion extends ModelVersionSummary {
  elements: ModelElement[];
}

// camera in the model's local frame; angles in radians, pitch < 0 looks down
export interface CameraState {
  position: { x: number; y: number; z: number };
  heading: number;
  pitch: number;
  roll: number;
}

export interface SavedView {
  camera: CameraState;
  selectedElementId: ElementId | null;
  versionId: VersionId;
  showChanges: boolean;
}
