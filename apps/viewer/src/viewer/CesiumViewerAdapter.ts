import {
  BoundingSphere,
  Cartesian3,
  Color,
  ColorMaterialProperty,
  ConstantPositionProperty,
  ConstantProperty,
  DirectionalLight,
  Entity,
  HeadingPitchRange,
  HeadingPitchRoll,
  Matrix4,
  ScreenSpaceEventType,
  Transforms,
  Viewer,
  type Cartesian2,
} from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import {
  ISSUE_OUTLINE_COLOR,
  type CameraState,
  type ElementGeometry,
  type ElementId,
  type SceneElement,
} from '@irv/review-core';
import {
  HOME_CAMERA,
  ViewerUnavailableError,
  type CameraHandler,
  type CameraOptions,
  type PickHandler,
  type ViewerAdapter,
} from './ViewerAdapter';

// Exton, PA
const SITE = { longitude: -75.63, latitude: 40.03, height: 120 } as const;
const FLIGHT_SECONDS = 1.2;
const GROUND_ENTITY_ID = 'ground';

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

// The only module that imports cesium.
// No globe/imagery/tokens: the model sits in a local ENU frame at the site, so nothing external is needed.
// Elements are box entities reconciled by id; CameraState is in local metres and converted to ECEF here.
export class CesiumViewerAdapter implements ViewerAdapter {
  private viewer: Viewer | null = null;
  private readonly frame: Matrix4;
  private readonly inverseFrame: Matrix4;
  private readonly pickHandlers = new Set<PickHandler>();
  private readonly cameraHandlers = new Set<CameraHandler>();
  private readonly elementEntities = new Map<ElementId, Entity>();
  private readonly markerEntities = new Map<ElementId, Entity>();
  private readonly entityToElement = new Map<string, ElementId>();
  private readonly appliedStyle = new Map<ElementId, string>();
  private scene: readonly SceneElement[] = [];
  private lastCamera: CameraState = HOME_CAMERA;
  private detachListeners: Array<() => void> = [];

  constructor() {
    const origin = Cartesian3.fromDegrees(SITE.longitude, SITE.latitude, SITE.height);
    this.frame = Transforms.eastNorthUpToFixedFrame(origin);
    this.inverseFrame = Matrix4.inverseTransformation(this.frame, new Matrix4());
  }

  mount(container: HTMLElement): void {
    if (this.viewer) this.dispose();
    let viewer: Viewer;
    try {
      viewer = new Viewer(container, {
        globe: false,
        baseLayer: false,
        skyBox: false,
        skyAtmosphere: false,
        animation: false,
        timeline: false,
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        fullscreenButton: false,
        vrButton: false,
        infoBox: false,
        selectionIndicator: false,
        shouldAnimate: false,
        contextOptions: { webgl: { failIfMajorPerformanceCaveat: false } },
      });
    } catch (error) {
      container.replaceChildren();
      throw new ViewerUnavailableError(error instanceof Error ? error.message : String(error));
    }
    this.viewer = viewer;

    const { scene, camera } = viewer;
    viewer.targetFrameRate = 30;
    scene.backgroundColor = Color.fromCssColorString('#edf1f5');
    if (scene.sun) scene.sun.show = false;
    if (scene.moon) scene.moon.show = false;
    scene.fog.enabled = false;
    scene.highDynamicRange = false;
    scene.light = new DirectionalLight({ direction: this.toWorldDirection(0.45, 0.3, -0.84) });
    const controller = scene.screenSpaceCameraController;
    controller.enableCollisionDetection = false;
    controller.minimumZoomDistance = 4;
    controller.maximumZoomDistance = 1500;

    // Viewer installs its own click/dblclick handlers (select/track entity) - we don't want those
    const input = viewer.screenSpaceEventHandler;
    input.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
    input.removeInputAction(ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
    input.setInputAction((event: { position: Cartesian2 }) => {
      const picked: unknown = scene.pick(event.position);
      this.emitPick(this.elementIdOf(picked));
    }, ScreenSpaceEventType.LEFT_CLICK);

    camera.percentageChanged = 0.01;
    const emit = () => this.emitCamera();
    this.detachListeners.push(camera.changed.addEventListener(emit), camera.moveEnd.addEventListener(emit));

    this.addGround();
    this.applyScene(this.scene);
    void this.setCamera(this.lastCamera, { animate: false });
  }

  dispose(): void {
    const viewer = this.viewer;
    if (!viewer) return;
    for (const detach of this.detachListeners) detach();
    this.detachListeners = [];
    if (!viewer.isDestroyed()) viewer.destroy();
    this.viewer = null;
    this.elementEntities.clear();
    this.markerEntities.clear();
    this.entityToElement.clear();
    this.appliedStyle.clear();
  }

  setScene(elements: readonly SceneElement[]): void {
    this.scene = elements;
    if (this.viewer) this.applyScene(elements);
  }

  getCamera(): CameraState {
    const viewer = this.viewer;
    if (!viewer) return this.lastCamera;
    const { camera } = viewer;
    const local = Matrix4.multiplyByPoint(this.inverseFrame, camera.positionWC, new Cartesian3());
    return {
      position: { x: local.x, y: local.y, z: local.z },
      heading: camera.heading,
      pitch: camera.pitch,
      roll: camera.roll,
    };
  }

  setCamera(state: CameraState, options: CameraOptions = {}): Promise<void> {
    this.lastCamera = state;
    const viewer = this.viewer;
    if (!viewer) return Promise.resolve();
    return new Promise((resolve) => {
      const finish = () => {
        this.emitCamera();
        resolve();
      };
      viewer.camera.flyTo({
        destination: this.toWorld(state.position),
        orientation: { heading: state.heading, pitch: state.pitch, roll: state.roll },
        duration: options.animate ? FLIGHT_SECONDS : 0,
        complete: finish,
        cancel: finish,
      });
    });
  }

  zoomTo(elementId: ElementId): Promise<void> {
    const viewer = this.viewer;
    const element = this.scene.find((candidate) => candidate.id === elementId);
    if (!viewer || !element) return Promise.resolve();
    const { position, dimensions } = element.geometry;
    const radius = 0.5 * Math.hypot(dimensions[0], dimensions[1], dimensions[2]);
    const sphere = new BoundingSphere(this.toWorld({ x: position[0], y: position[1], z: position[2] }), radius);
    return new Promise((resolve) => {
      const finish = () => {
        this.emitCamera();
        resolve();
      };
      viewer.camera.flyToBoundingSphere(sphere, {
        duration: FLIGHT_SECONDS,
        offset: new HeadingPitchRange(viewer.camera.heading, -0.4, radius * 4 + 14),
        complete: finish,
        cancel: finish,
      });
    });
  }

  resetView(): Promise<void> {
    return this.setCamera(HOME_CAMERA, { animate: true });
  }

  onPick(handler: PickHandler): () => void {
    this.pickHandlers.add(handler);
    return () => this.pickHandlers.delete(handler);
  }

  onCameraChanged(handler: CameraHandler): () => void {
    this.cameraHandlers.add(handler);
    return () => this.cameraHandlers.delete(handler);
  }

  private applyScene(elements: readonly SceneElement[]): void {
    const viewer = this.viewer;
    if (!viewer) return;
    const seen = new Set<ElementId>();

    for (const element of elements) {
      seen.add(element.id);
      const styleKey = JSON.stringify([element.geometry, element.color, element.alpha, element.outlineColor]);
      const existing = this.elementEntities.get(element.id);
      if (!existing) {
        const entity = viewer.entities.add({
          id: `element:${element.id}`,
          name: element.name,
          position: this.positionOf(element.geometry),
          orientation: this.orientationOf(element.geometry),
          box: {
            dimensions: this.dimensionsOf(element.geometry),
            material: this.fillColor(element),
            outline: true,
            outlineColor: this.outlineColorOf(element),
          },
        });
        this.elementEntities.set(element.id, entity);
        this.entityToElement.set(entity.id, element.id);
        this.appliedStyle.set(element.id, styleKey);
      } else if (this.appliedStyle.get(element.id) !== styleKey) {
        existing.position = new ConstantPositionProperty(this.positionOf(element.geometry));
        existing.orientation = new ConstantProperty(this.orientationOf(element.geometry));
        const box = existing.box;
        if (box) {
          box.dimensions = new ConstantProperty(this.dimensionsOf(element.geometry));
          box.material = new ColorMaterialProperty(this.fillColor(element));
          box.outlineColor = new ConstantProperty(this.outlineColorOf(element));
        }
        this.appliedStyle.set(element.id, styleKey);
      }
      this.syncMarker(element);
    }

    for (const [elementId, entity] of this.elementEntities) {
      if (seen.has(elementId)) continue;
      viewer.entities.remove(entity);
      this.elementEntities.delete(elementId);
      this.entityToElement.delete(entity.id);
      this.appliedStyle.delete(elementId);
      this.removeMarker(elementId);
    }
  }

  // issue marker: a point above the element, always on top
  private syncMarker(element: SceneElement): void {
    const viewer = this.viewer;
    if (!viewer) return;
    const existing = this.markerEntities.get(element.id);
    if (element.marker !== 'issue') {
      if (existing) this.removeMarker(element.id);
      return;
    }
    const { position, dimensions } = element.geometry;
    const anchor = this.toWorld({ x: position[0], y: position[1], z: position[2] + dimensions[2] / 2 + 2.5 });
    if (existing) {
      existing.position = new ConstantPositionProperty(anchor);
      return;
    }
    const entity = viewer.entities.add({
      id: `marker:${element.id}`,
      position: anchor,
      point: {
        pixelSize: 14,
        color: Color.fromCssColorString(ISSUE_OUTLINE_COLOR),
        outlineColor: Color.WHITE,
        outlineWidth: 2,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });
    this.markerEntities.set(element.id, entity);
    this.entityToElement.set(entity.id, element.id);
  }

  private removeMarker(elementId: ElementId): void {
    const entity = this.markerEntities.get(elementId);
    if (!entity) return;
    this.viewer?.entities.remove(entity);
    this.markerEntities.delete(elementId);
    this.entityToElement.delete(entity.id);
  }

  // reference plane under the structure, not part of the model
  private addGround(): void {
    this.viewer?.entities.add({
      id: GROUND_ENTITY_ID,
      position: this.toWorld({ x: 0, y: 0, z: -0.5 }),
      box: { dimensions: new Cartesian3(1200, 900, 1), material: Color.fromCssColorString('#c9d3de'), outline: false },
    });
  }

  private elementIdOf(picked: unknown): ElementId | null {
    if (!picked || typeof picked !== 'object') return null;
    const entity = (picked as { id?: unknown }).id;
    return entity instanceof Entity ? (this.entityToElement.get(entity.id) ?? null) : null;
  }

  private emitPick(elementId: ElementId | null): void {
    for (const handler of this.pickHandlers) handler(elementId);
  }

  private emitCamera(): void {
    const camera = this.getCamera();
    this.lastCamera = camera;
    for (const handler of this.cameraHandlers) handler(camera);
  }

  private toWorld(local: Vec3): Cartesian3 {
    return Matrix4.multiplyByPoint(this.frame, new Cartesian3(local.x, local.y, local.z), new Cartesian3());
  }

  private toWorldDirection(x: number, y: number, z: number): Cartesian3 {
    const direction = Matrix4.multiplyByPointAsVector(this.frame, new Cartesian3(x, y, z), new Cartesian3());
    return Cartesian3.normalize(direction, direction);
  }

  private positionOf(geometry: ElementGeometry): Cartesian3 {
    return this.toWorld({ x: geometry.position[0], y: geometry.position[1], z: geometry.position[2] });
  }

  private orientationOf(geometry: ElementGeometry) {
    return Transforms.headingPitchRollQuaternion(
      this.positionOf(geometry),
      new HeadingPitchRoll(geometry.heading, 0, 0),
    );
  }

  private dimensionsOf(geometry: ElementGeometry): Cartesian3 {
    return new Cartesian3(geometry.dimensions[0], geometry.dimensions[1], geometry.dimensions[2]);
  }

  private fillColor(element: SceneElement): Color {
    return Color.fromCssColorString(element.color).withAlpha(element.alpha);
  }

  private outlineColorOf(element: SceneElement): Color {
    return Color.fromCssColorString(element.outlineColor);
  }
}
