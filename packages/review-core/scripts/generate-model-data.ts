// writes the mock API payloads; runs on `pnpm build` so they can't drift from generateBridge()
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BRIDGE_VERSIONS, BRIDGE_VERSION_IDS, MODEL_ID, generateBridge } from '../src/index';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, '../../../apps/viewer/public/api/models', MODEL_ID);

async function main(): Promise<void> {
  await mkdir(path.join(outDir, 'versions'), { recursive: true });
  await writeFile(path.join(outDir, 'versions.json'), `${JSON.stringify({ versions: BRIDGE_VERSIONS }, null, 2)}\n`);
  for (const versionId of BRIDGE_VERSION_IDS) {
    const model = generateBridge(versionId);
    await writeFile(path.join(outDir, 'versions', `${versionId}.json`), `${JSON.stringify(model, null, 2)}\n`);
    console.log(`wrote ${versionId}: ${model.elements.length} elements`);
  }
  console.log(`model data written to ${outDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
