import type { CameraState, ElementId, SceneElement } from '@irv/review-core';
import { HOME_CAMERA, type CameraHandler, type PickHandler, type ViewerAdapter } from '../src/viewer/ViewerAdapter';

export class FakeViewerAdapter implements ViewerAdapter {
  scene: readonly SceneElement[] = [];
  camera: CameraState = HOME_CAMERA;
  mounted = false;
  readonly calls: string[] = [];
  private readonly pickHandlers = new Set<PickHandler>();
  private readonly cameraHandlers = new Set<CameraHandler>();

  mount(): void {
    this.mounted = true;
    this.calls.push('mount');
    this.emitCamera();
  }

  dispose(): void {
    this.mounted = false;
    this.calls.push('dispose');
  }

  setScene(elements: readonly SceneElement[]): void {
    this.scene = elements;
  }

  getCamera(): CameraState {
    return this.camera;
  }

  async setCamera(camera: CameraState): Promise<void> {
    this.camera = camera;
    this.calls.push(`setCamera:${camera.position.x},${camera.position.y},${camera.position.z}`);
    this.emitCamera();
  }

  async zoomTo(elementId: ElementId): Promise<void> {
    this.camera = { ...this.camera, position: { x: 1, y: 2, z: 3 } };
    this.calls.push(`zoomTo:${elementId}`);
    this.emitCamera();
  }

  async resetView(): Promise<void> {
    this.camera = HOME_CAMERA;
    this.calls.push('resetView');
    this.emitCamera();
  }

  onPick(handler: PickHandler): () => void {
    this.pickHandlers.add(handler);
    return () => this.pickHandlers.delete(handler);
  }

  onCameraChanged(handler: CameraHandler): () => void {
    this.cameraHandlers.add(handler);
    if (this.mounted) handler(this.camera);
    return () => this.cameraHandlers.delete(handler);
  }

  simulatePick(elementId: ElementId | null): void {
    for (const handler of this.pickHandlers) handler(elementId);
  }

  sceneElement(id: ElementId): SceneElement | undefined {
    return this.scene.find((element) => element.id === id);
  }

  private emitCamera(): void {
    for (const handler of this.cameraHandlers) handler(this.camera);
  }
}
