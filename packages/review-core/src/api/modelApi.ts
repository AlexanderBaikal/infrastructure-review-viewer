import type { ModelVersion, ModelVersionSummary, VersionId } from '../model/types';

// GET {baseUrl}/models/{modelId}/versions.json            -> { versions: [...] }
// GET {baseUrl}/models/{modelId}/versions/{versionId}.json -> ModelVersion
// static JSON in the demo; point baseUrl at a real service otherwise
export interface ModelApiClient {
  getVersions(): Promise<ModelVersionSummary[]>;
  getModel(versionId: VersionId): Promise<ModelVersion>;
}

export class ModelApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly url: string,
  ) {
    super(message);
    this.name = 'ModelApiError';
  }
}

export type FetchLike = (url: string) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export interface ModelApiOptions {
  baseUrl: string;
  modelId: string;
  fetchImpl?: FetchLike;
}

interface VersionsResponse {
  versions: ModelVersionSummary[];
}

export function createModelApiClient({ baseUrl, modelId, fetchImpl }: ModelApiOptions): ModelApiClient {
  const doFetch: FetchLike = fetchImpl ?? ((url) => fetch(url));
  const root = `${baseUrl.replace(/\/$/, '')}/models/${encodeURIComponent(modelId)}`;

  async function getJson<T>(url: string): Promise<T> {
    let response: Awaited<ReturnType<FetchLike>>;
    try {
      response = await doFetch(url);
    } catch (error) {
      throw new ModelApiError(`Network error while requesting ${url}: ${(error as Error).message}`, 0, url);
    }
    if (!response.ok)
      throw new ModelApiError(`Request to ${url} failed with status ${response.status}`, response.status, url);
    return (await response.json()) as T;
  }

  return {
    async getVersions() {
      const body = await getJson<VersionsResponse>(`${root}/versions.json`);
      return body.versions;
    },
    getModel(versionId) {
      return getJson<ModelVersion>(`${root}/versions/${encodeURIComponent(versionId)}.json`);
    },
  };
}
