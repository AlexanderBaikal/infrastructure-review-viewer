import { expect, test, type Page } from '@playwright/test';

const ISSUE_TITLE = 'Girder seat 40 mm below design level';

async function openApp(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('treeitem')).toHaveCount(19);
}

async function waitForCamera(page: Page) {
  await expect(page.getByTestId('camera-readout')).toHaveAttribute('data-busy', 'false');
}

test.describe('design review workflow', () => {
  test('select, inspect, report, restore context, compare versions, persist', async ({ page }) => {
    await openApp(page);

    // Select an element from the model tree and inspect its properties.
    const pier = page.getByTestId('tree-item-P-3');
    await pier.click();
    await expect(pier).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('selected-element')).toHaveText('Pier P-3');
    await expect(page.getByTestId('element-properties')).toContainText('Reinforced concrete');

    // Report an issue on it.
    await page.getByTestId('issue-title').fill(ISSUE_TITLE);
    await page.getByTestId('issue-severity').selectOption('high');
    await page.getByTestId('issue-description').fill('Bearing seat elevation clashes with the G-3-R bottom flange.');
    await page.getByTestId('create-issue').click();
    const card = page.getByTestId('issue-card');
    await expect(card).toHaveCount(1);
    await expect(card).toContainText(ISSUE_TITLE);
    await expect(page.getByTestId('open-count')).toHaveText('1 open');
    await expect(pier.getByLabel('has an open issue')).toBeVisible();

    // Move on to another element, then jump back through the issue's saved view.
    await page.getByTestId('tree-item-A-1').click();
    await expect(page.getByTestId('selected-element')).toHaveText('Abutment A-1');
    await page.getByTestId('issue-restore').click();
    await expect(pier).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('selected-element')).toHaveText('Pier P-3');

    // Compare with the previous version.
    await page.getByTestId('compare-toggle').check();
    await expect(page.getByTestId('changes-summary')).toHaveText('2 added · 2 modified · 1 removed');
    await expect(page.getByTestId('change-badge-P-3')).toHaveText('modified');
    await expect(page.getByTestId('change-badge-L-1')).toHaveText('added');
    await expect(page.getByTestId('change-badge-U-1')).toHaveText('removed');
    await expect(page.getByRole('treeitem')).toHaveCount(20);

    // Resolve the issue; it must survive a reload.
    await page.getByTestId('issue-status-toggle').click();
    await expect(page.getByTestId('open-count')).toHaveText('0 open');
    await page.reload();
    await expect(page.getByRole('treeitem')).toHaveCount(19);
    await expect(page.getByTestId('issue-card')).toHaveCount(1);
    await expect(page.getByTestId('issue-card')).toHaveAttribute('data-status', 'resolved');
    await expect(page.getByTestId('issue-card')).toContainText(ISSUE_TITLE);
  });

  test('restoring an issue brings the camera back to the saved viewpoint', async ({ page }) => {
    await openApp(page);
    test.skip(await page.getByTestId('webgl-banner').isVisible(), 'WebGL is not available in this browser');
    const readout = page.getByTestId('camera-readout');
    await expect(readout).not.toHaveText('camera —');
    const home = (await readout.textContent()) ?? '';

    await page.getByTestId('tree-item-P-3').click();
    await page.getByTestId('zoom-to-selected').click();
    await waitForCamera(page);
    await expect(readout).not.toHaveText(home);
    const savedReadout = (await readout.textContent()) ?? '';

    await page.getByTestId('issue-title').fill('Check bearing seat level');
    await page.getByTestId('create-issue').click();
    await expect(page.getByTestId('issue-card')).toHaveCount(1);

    await page.getByTestId('tree-item-A-1').click();
    await page.getByTestId('zoom-to-selected').click();
    await waitForCamera(page);
    await expect(readout).not.toHaveText(savedReadout);

    await page.getByTestId('issue-restore').click();
    await waitForCamera(page);
    await expect(readout).toHaveText(savedReadout);
    await expect(page.getByTestId('selected-element')).toHaveText('Pier P-3');
  });

  test('the first version has no baseline to compare against', async ({ page }) => {
    await openApp(page);
    await page.getByTestId('version-select').selectOption('v11');
    await expect(page.getByRole('treeitem')).toHaveCount(18);
    await expect(page.getByTestId('tree-item-U-1')).toBeVisible();
    await expect(page.getByTestId('compare-toggle')).toBeDisabled();
  });
});
