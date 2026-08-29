import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  InMemoryIssueRepository,
  LocalStorageIssueRepository,
  MODEL_ID,
  createModelApiClient,
  type IssueRepository,
} from '@irv/review-core';
import { App } from './app/App';
import { CesiumViewerAdapter } from './viewer/CesiumViewerAdapter';
import './styles/app.css';

function createIssueRepository(): IssueRepository {
  try {
    return new LocalStorageIssueRepository(window.localStorage);
  } catch {
    // storage can be blocked (privacy mode, sandboxed iframe)
    return new InMemoryIssueRepository();
  }
}

const api = createModelApiClient({ baseUrl: `${import.meta.env.BASE_URL}api`, modelId: MODEL_ID });
const adapter = new CesiumViewerAdapter();
const issueRepository = createIssueRepository();

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <App api={api} issueRepository={issueRepository} adapter={adapter} />
  </StrictMode>,
);
