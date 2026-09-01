import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  BRIDGE_VERSIONS,
  InMemoryIssueRepository,
  ModelApiError,
  generateBridge,
  type ModelApiClient,
} from '@irv/review-core';
import { describe, expect, it } from 'vitest';
import { App } from '../src/app/App';
import { FakeViewerAdapter } from './FakeViewerAdapter';

function fakeApi(): ModelApiClient {
  return {
    getVersions: async () => [...BRIDGE_VERSIONS],
    getModel: async (id) => generateBridge(id as 'v11' | 'v12'),
  };
}

describe('App', () => {
  it('runs the review workflow against a fake viewer', async () => {
    const user = userEvent.setup();
    const adapter = new FakeViewerAdapter();
    const repository = new InMemoryIssueRepository();
    render(<App api={fakeApi()} issueRepository={repository} adapter={adapter} />);

    expect(await screen.findAllByRole('treeitem')).toHaveLength(19);
    expect(adapter.mounted).toBe(true);
    expect(adapter.scene).toHaveLength(19);

    // Picking in the 3D view selects the element everywhere.
    act(() => adapter.simulatePick('P-3'));
    expect(screen.getByTestId('selected-element')).toHaveTextContent('Pier P-3');
    expect(screen.getByTestId('tree-item-P-3')).toHaveAttribute('aria-selected', 'true');
    expect(adapter.sceneElement('P-3')?.selected).toBe(true);

    // Creating an issue captures the current camera and marks the element.
    await user.type(screen.getByTestId('issue-title'), 'Seat level clash');
    await user.click(screen.getByTestId('create-issue'));
    expect(screen.getByTestId('open-count')).toHaveTextContent('1 open');
    expect(adapter.sceneElement('P-3')?.marker).toBe('issue');
    expect(repository.load()).toHaveLength(1);
    expect(repository.load()[0]?.savedView.camera.position.x).toBe(adapter.camera.position.x);

    // Move the camera elsewhere, then restore the saved view from the issue.
    await user.click(screen.getByTestId('tree-item-A-1'));
    await user.click(screen.getByTestId('zoom-to-selected'));
    expect(adapter.calls).toContain('zoomTo:A-1');
    expect(adapter.camera.position.x).toBe(1);
    await user.click(screen.getByTestId('issue-restore'));
    expect(screen.getByTestId('selected-element')).toHaveTextContent('Pier P-3');
    expect(adapter.camera).toEqual(repository.load()[0]?.savedView.camera);

    // Compare versions: counts, ghost element, tree badge.
    await user.click(screen.getByTestId('compare-toggle'));
    expect(screen.getByTestId('changes-summary')).toHaveTextContent('2 added · 2 modified · 1 removed');
    expect(adapter.sceneElement('U-1')?.ghost).toBe(true);
    expect(screen.getByTestId('change-badge-G-3-R')).toHaveTextContent('modified');

    // Escape clears the selection.
    await user.keyboard('{Escape}');
    expect(screen.queryByTestId('selected-element')).toBeNull();
    expect(screen.getByTestId('issue-form-placeholder')).toBeInTheDocument();
  });

  it('switching to a version without a baseline disables comparison', async () => {
    const user = userEvent.setup();
    render(<App api={fakeApi()} issueRepository={new InMemoryIssueRepository()} adapter={new FakeViewerAdapter()} />);
    await screen.findAllByRole('treeitem');
    await user.selectOptions(screen.getByTestId('version-select'), 'v11');
    expect(screen.getAllByRole('treeitem')).toHaveLength(18);
    expect(screen.getByTestId('compare-toggle')).toBeDisabled();
  });

  it('reports model loading failures', async () => {
    const api: ModelApiClient = {
      getVersions: () => Promise.reject(new ModelApiError('Request failed with status 503', 503, '/api/versions.json')),
      getModel: () => Promise.reject(new Error('unreachable')),
    };
    render(<App api={api} issueRepository={new InMemoryIssueRepository()} adapter={new FakeViewerAdapter()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Request failed with status 503');
  });
});
