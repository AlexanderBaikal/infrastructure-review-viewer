import { describe, expect, it, vi } from 'vitest';
import {
  BRIDGE_VERSIONS,
  MODEL_ID,
  ModelApiError,
  createModelApiClient,
  generateBridge,
  type FetchLike,
} from '../src/index';

function fakeFetch(routes: Record<string, unknown>): FetchLike & ReturnType<typeof vi.fn> {
  return vi.fn(async (url: string) => {
    const body = routes[url];
    return body === undefined
      ? { ok: false, status: 404, json: async () => ({}) }
      : { ok: true, status: 200, json: async () => body };
  });
}

describe('createModelApiClient', () => {
  const baseUrl = '/app/api/';
  const v12 = generateBridge('v12');

  it('requests versions and models from REST-style resource paths', async () => {
    const fetchImpl = fakeFetch({
      [`/app/api/models/${MODEL_ID}/versions.json`]: { versions: BRIDGE_VERSIONS },
      [`/app/api/models/${MODEL_ID}/versions/v12.json`]: v12,
    });
    const client = createModelApiClient({ baseUrl, modelId: MODEL_ID, fetchImpl });
    await expect(client.getVersions()).resolves.toEqual(BRIDGE_VERSIONS);
    await expect(client.getModel('v12')).resolves.toEqual(v12);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('surfaces HTTP failures as ModelApiError with the status code', async () => {
    const client = createModelApiClient({ baseUrl, modelId: MODEL_ID, fetchImpl: fakeFetch({}) });
    const error = await client.getModel('v99').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ModelApiError);
    expect((error as ModelApiError).status).toBe(404);
    expect((error as ModelApiError).url).toContain('/versions/v99.json');
  });

  it('wraps network errors', async () => {
    const failing: FetchLike = () => Promise.reject(new Error('offline'));
    const client = createModelApiClient({ baseUrl, modelId: MODEL_ID, fetchImpl: failing });
    await expect(client.getVersions()).rejects.toMatchObject({ name: 'ModelApiError', status: 0 });
  });
});
