import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { generateBridge } from '@irv/review-core';
import { describe, expect, it, vi } from 'vitest';
import { ModelTree, type TreeItem } from '../src/features/model-tree/ModelTree';

const items: TreeItem[] = generateBridge('v12').elements.map((element) => ({
  element,
  change: element.id === 'P-3' ? 'modified' : null,
  hasOpenIssue: element.id === 'G-3-R',
  ghost: false,
}));

describe('ModelTree', () => {
  it('groups elements by category and exposes the selection through ARIA', () => {
    render(<ModelTree items={items} selectedId="P-3" onSelect={vi.fn()} />);
    expect(screen.getByRole('tree', { name: 'Model tree' })).toBeInTheDocument();
    expect(screen.getAllByRole('group')).toHaveLength(5);
    expect(screen.getAllByRole('treeitem')).toHaveLength(19);
    expect(screen.getByTestId('tree-item-P-3')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('tree-item-P-1')).toHaveAttribute('aria-selected', 'false');
  });

  it('selects on click and on Enter', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ModelTree items={items} selectedId={null} onSelect={onSelect} />);
    await user.click(screen.getByTestId('tree-item-D-2'));
    expect(onSelect).toHaveBeenCalledWith('D-2');
    screen.getByTestId('tree-item-G-1-L').focus();
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenLastCalledWith('G-1-L');
  });

  it('shows change and open-issue badges', () => {
    render(<ModelTree items={items} selectedId={null} onSelect={vi.fn()} />);
    expect(screen.getByTestId('change-badge-P-3')).toHaveTextContent('modified');
    expect(screen.queryByTestId('change-badge-P-1')).toBeNull();
    expect(screen.getByTestId('tree-item-G-3-R')).toHaveTextContent('!');
  });
});
