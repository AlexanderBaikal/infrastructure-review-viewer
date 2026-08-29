import type { CameraState } from '@irv/review-core';

const toDegrees = (radians: number) => Math.round((radians * 180) / Math.PI);

// shown in the status bar; e2e compares this string after restoring a saved view
export function formatCamera(camera: CameraState): string {
  const { position, heading, pitch } = camera;
  return `heading ${toDegrees(heading)}° · pitch ${toDegrees(pitch)}° · eye ${Math.round(position.x)}, ${Math.round(position.y)}, ${Math.round(position.z)} m`;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
