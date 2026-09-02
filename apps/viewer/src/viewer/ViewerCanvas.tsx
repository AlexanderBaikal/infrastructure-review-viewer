import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { SceneElement } from '@irv/review-core';
import type { CameraHandler, PickHandler, ViewerAdapter } from './ViewerAdapter';

interface ViewerCanvasProps {
  adapter: ViewerAdapter;
  scene: readonly SceneElement[];
  onPick: PickHandler;
  onCameraChanged: CameraHandler;
  children?: ReactNode;
}

export function ViewerCanvas({ adapter, scene, onPick, onCameraChanged, children }: ViewerCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  // subscribe before mount, otherwise the initial camera state is missed
  useEffect(() => adapter.onPick(onPick), [adapter, onPick]);
  useEffect(() => adapter.onCameraChanged(onCameraChanged), [adapter, onCameraChanged]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    try {
      adapter.mount(container);
      setError(null);
    } catch (mountError) {
      setError(mountError instanceof Error ? mountError.message : String(mountError));
      return undefined;
    }
    return () => adapter.dispose();
  }, [adapter]);
  useEffect(() => {
    adapter.setScene(scene);
  }, [adapter, scene]);

  return (
    <section className="viewer" aria-label="3D viewer" data-testid="viewer">
      <div ref={containerRef} className="viewer__canvas" />
      {error && (
        <div className="viewer__banner" role="alert" data-testid="webgl-banner">
          <strong>3D view unavailable.</strong> {error} Selection, issues and change tracking still work from the model
          tree.
        </div>
      )}
      {children}
    </section>
  );
}
