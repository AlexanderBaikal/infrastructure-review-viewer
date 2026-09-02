import type { CameraState, ElementId, SceneElement } from '@irv/review-core';

export interface CameraOptions {
  animate?: boolean;
}

export type PickHandler = (elementId: ElementId | null) => void;
export type CameraHandler = (camera: CameraState) => void;

// the only thing the UI knows about the 3D engine; CesiumViewerAdapter implements it, tests use a fake
export interface ViewerAdapter {
  mount(container: HTMLElement): void;
  dispose(): void;

  setScene(elements: readonly SceneElement[]): void;
  getCamera(): CameraState;
  setCamera(camera: CameraState, options?: CameraOptions): Promise<void>;
  zoomTo(elementId: ElementId): Promise<void>;
  resetView(): Promise<void>;
  onPick(handler: PickHandler): () => void;
  // while mounted the handler is also called right away with the current camera
  onCameraChanged(handler: CameraHandler): () => void;
}

export class ViewerUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ViewerUnavailableError';
  }
}

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export function lookAt(eye: Vec3, target: Vec3): CameraState {
  const dx = target.x - eye.x;
  const dy = target.y - eye.y;
  const dz = target.z - eye.z;
  const twoPi = Math.PI * 2;
  return {
    position: { ...eye },
    heading: (Math.atan2(dx, dy) + twoPi) % twoPi,
    pitch: Math.atan2(dz, Math.hypot(dx, dy)),
    roll: 0,
  };
}

// home view: south-west of the bridge, elevated
export const HOME_CAMERA: CameraState = lookAt({ x: -118, y: -98, z: 58 }, { x: 0, y: 0, z: 6 });
