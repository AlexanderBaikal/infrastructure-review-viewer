import { useEffect, useState } from 'react';
import type { ModelApiClient, ModelVersion, ModelVersionSummary, VersionId } from '@irv/review-core';

export type ModelData =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; versions: ModelVersionSummary[]; modelsById: Record<VersionId, ModelVersion> };

// loads all versions up front - the diff needs the previous one anyway
export function useModelData(api: ModelApiClient): ModelData {
  const [data, setData] = useState<ModelData>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setData({ status: 'loading' });
    (async () => {
      const versions = await api.getVersions();
      const models = await Promise.all(versions.map((version) => api.getModel(version.id)));
      if (cancelled) return;
      const modelsById = Object.fromEntries(models.map((model) => [model.id, model]));
      setData({ status: 'ready', versions, modelsById });
    })().catch((error: unknown) => {
      if (cancelled) return;
      setData({ status: 'error', message: error instanceof Error ? error.message : 'Failed to load the model.' });
    });
    return () => {
      cancelled = true;
    };
  }, [api]);

  return data;
}
