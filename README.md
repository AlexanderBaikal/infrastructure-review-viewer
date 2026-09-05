# Infrastructure Review Viewer

Small design-review app on top of a 3D viewer (CesiumJS): pick an element, see its properties, log an issue that remembers where the camera was, come back to it later, and see what changed between two versions of the model.

Live: https://alexanderbaikal.github.io/infrastructure-review-viewer/ &nbsp; [![CI](https://github.com/AlexanderBaikal/infrastructure-review-viewer/actions/workflows/ci.yml/badge.svg)](https://github.com/AlexanderBaikal/infrastructure-review-viewer/actions/workflows/ci.yml)

![walkthrough](docs/review-workflow.gif)

## What it does

- model tree + click-to-pick in the 3D view, properties in the status bar
- issues carry a saved view (camera, selected element, version, compare mode); click an issue to jump back to it
- compare with the previous version: added / modified / removed get colour-coded, removed elements are drawn as ghosts
- issues live in localStorage, can be resolved / reopened / filtered

The model is a made-up 4-span bridge with two versions. v11 → v12 adds two lighting columns, raises a pier, changes a girder's steel grade and drops a utility duct, so the diff has something to show.

## How it's put together

pnpm workspace, two packages:

- `packages/review-core` – plain TypeScript, no React, no Cesium. Model types, `diffVersions`, the issue store, `buildScene` (turns selection / changes / issues into colours) and a small fetch client for the JSON "API".
- `apps/viewer` – React + Vite. The only file that imports cesium is `CesiumViewerAdapter.ts`; everything else goes through a `ViewerAdapter` interface (mount, setScene, get/setCamera, zoomTo, onPick). Tests use an in-memory fake instead of Cesium.

Model data is static JSON under `public/api/models/…`, laid out like a REST API (a versions list plus one file per version). It's generated from the same bridge generator on `pnpm build`, and a test checks the two don't drift.

Why Cesium and not iTwin.js: the iTwin viewer wants a hosted iModel and OIDC, too much for a static demo. The adapter is where an iTwin.js implementation would plug in — camera state is kept in model coordinates, change colouring maps onto feature overrides, saved views and issues map onto the corresponding iTwin APIs.

Things worth knowing:

- Cesium loads its workers at runtime from `CESIUM_BASE_URL`. With pnpm the usual static-copy plugin mirrored the whole `node_modules` path into `dist`, so there's a ten-line Vite plugin instead, and the base URL is set in `index.html` so it also works under the GitHub Pages sub-path.
- `requestRenderMode` looked tempting, but entity restyling only progresses in rendered frames, so it stays off (30 fps cap instead).
- No globe, imagery or tokens. Deterministic, works offline, nothing external is requested.

## Run

```
pnpm install
pnpm dev
pnpm test        # vitest: core in node, viewer in jsdom
pnpm build
pnpm test:e2e    # playwright against vite preview (needs a build)
```

Node 22+, pnpm 9.

## Tests

- core: version diff, the bridge fixture (2 / 2 / 1 and JSON in sync), issue validation and reducer, repositories with corrupt data, scene styling precedence, API errors
- viewer: `ModelTree`, `IssuePanel`, and the whole flow in `App.test.tsx` with the fake adapter
- e2e: full workflow incl. persistence across reload, camera restore from a saved view, version switch — Chromium + SwiftShader, runs in CI

CI: typecheck → unit → build → deploy to Pages. E2E runs alongside and doesn't block the deploy.

## Not done

- iTwin.js adapter against a real iModel
- real Changed Elements / Saved Views / Issues APIs behind the same interfaces
- collapsible tree groups, measurements, section cuts

MIT
