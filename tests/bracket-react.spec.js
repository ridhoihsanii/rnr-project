const { test, expect } = require('@playwright/test');

// Helper: set up localStorage with N participants and a given tournament size,
// then reload the page. The server must be running at http://127.0.0.1:8080.
async function setupBracket(page, size) {
  await page.goto('/index.html');
  await page.evaluate(function(sz) {
    var participants = [];
    for (var i = 1; i <= sz; i++) {
      participants.push({
        id: 'row-' + i,
        drawingNumber: i,
        name: 'Player ' + i,
        hc: 'HC 3B',
        hcCustom: '',
        status: '',
      });
    }
    localStorage.setItem('RNR INTAN_tournament', JSON.stringify({ size: sz, status: 'setup', currentRound: 0 }));
    localStorage.setItem('RNR INTAN_participants', JSON.stringify(participants));
    localStorage.removeItem('RNR INTAN_bracket');
  }, size);
  await page.reload();
}

test.describe('React Bracket Module', () => {
  test('Bracket nav item is visible', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator('[data-section="bracket"]')).toBeVisible();
  });

  test('bracket section becomes active after clicking nav', async ({ page }) => {
    await setupBracket(page, 16);
    await page.click('[data-section="bracket"]');
    await expect(page.locator('#section-bracket')).toBeVisible();
  });

  test('renders bracket-view for 16 participants', async ({ page }) => {
    await setupBracket(page, 16);
    await page.click('[data-section="bracket"]');
    await page.waitForSelector('.bracket-view', { timeout: 8000 });
    await expect(page.locator('.bracket-view')).toBeVisible();
  });

  test('renders 4 round columns for 16 participants', async ({ page }) => {
    await setupBracket(page, 16);
    await page.click('[data-section="bracket"]');
    await page.waitForSelector('.round-column', { timeout: 8000 });
    const count = await page.locator('.round-column').count();
    expect(count).toBe(4); // log2(16) = 4 rounds
  });

  test('first round label is ROUND 1 and last is FINAL', async ({ page }) => {
    await setupBracket(page, 16);
    await page.click('[data-section="bracket"]');
    await page.waitForSelector('.round-label', { timeout: 8000 });
    const labels = await page.locator('.round-label').allTextContents();
    expect(labels[0]).toContain('ROUND 1');
    expect(labels[labels.length - 1]).toContain('FINAL');
  });

  test('round 1 match cards contain participant dropdowns', async ({ page }) => {
    await setupBracket(page, 16);
    await page.click('[data-section="bracket"]');
    await page.waitForSelector('.participant-select', { timeout: 8000 });
    const selectCount = await page.locator('.participant-select').count();
    // 8 matches Ã— 2 slots = 16 dropdowns in round 1
    expect(selectCount).toBeGreaterThanOrEqual(16);
  });

  test('participant dropdown options include HC label', async ({ page }) => {
    await setupBracket(page, 16);
    await page.click('[data-section="bracket"]');
    await page.waitForSelector('.participant-select', { timeout: 8000 });
    const firstSelect = page.locator('.participant-select').first();
    const options = await firstSelect.locator('option').allTextContents();
    const hasHc = options.some(function(o) { return o.includes('HC 3B'); });
    expect(hasHc).toBe(true);
  });

  test('LIVE button marks match card with live class', async ({ page }) => {
    await setupBracket(page, 16);
    await page.click('[data-section="bracket"]');
    await page.waitForSelector('.live-btn', { timeout: 8000 });
    await page.locator('.live-btn').first().click();
    await expect(page.locator('.match-card.is-live').first()).toBeVisible();
  });

  test('only one match is live at a time', async ({ page }) => {
    await setupBracket(page, 16);
    await page.click('[data-section="bracket"]');
    await page.waitForSelector('.live-btn', { timeout: 8000 });
    await page.locator('.live-btn').nth(0).click();
    await page.locator('.live-btn').nth(1).click();
    const liveCount = await page.locator('.match-card.is-live').count();
    expect(liveCount).toBe(1);
  });

  test('clicking active LIVE button deactivates it', async ({ page }) => {
    await setupBracket(page, 16);
    await page.click('[data-section="bracket"]');
    await page.waitForSelector('.live-btn', { timeout: 8000 });
    const btn = page.locator('.live-btn').first();
    await btn.click(); // activate
    await expect(page.locator('.match-card.is-live').first()).toBeVisible();
    await btn.click(); // deactivate
    const liveCount = await page.locator('.match-card.is-live').count();
    expect(liveCount).toBe(0);
  });

  test('entering scores shows WIN/LOSE badges', async ({ page }) => {
    await setupBracket(page, 16);
    await page.click('[data-section="bracket"]');
    await page.waitForSelector('.score-input', { timeout: 8000 });

    // Select two participants in the first match
    const selects = page.locator('.participant-select');
    await selects.nth(0).selectOption({ index: 1 }); // first available participant
    await selects.nth(1).selectOption({ index: 1 }); // first available (different due to dedup)

    // Enter scores
    const inputs = page.locator('.score-input');
    await inputs.nth(0).fill('7');
    await inputs.nth(1).fill('5');
    await page.waitForTimeout(300);

    await expect(page.locator('.badge.win').first()).toBeVisible();
    await expect(page.locator('.badge.lose').first()).toBeVisible();
  });

  test('bracket state persists after page reload', async ({ page }) => {
    await setupBracket(page, 16);
    await page.click('[data-section="bracket"]');
    await page.waitForSelector('.live-btn', { timeout: 8000 });

    // Activate LIVE on first match
    await page.locator('.live-btn').first().click();
    await expect(page.locator('.match-card.is-live').first()).toBeVisible();

    // Reload
    await page.reload();
    await page.click('[data-section="bracket"]');
    await page.waitForSelector('.match-card.is-live', { timeout: 8000 });
    const liveCount = await page.locator('.match-card.is-live').count();
    expect(liveCount).toBe(1);
  });

  test('renders 7 round columns for 128 participants', async ({ page }) => {
    await setupBracket(page, 128);
    await page.click('[data-section="bracket"]');
    await page.waitForSelector('.round-column', { timeout: 10000 });
    const count = await page.locator('.round-column').count();
    expect(count).toBe(7); // log2(128) = 7 rounds
  });

  test('shows empty state when tournament is not configured', async ({ page }) => {
    await page.goto('/index.html');
    await page.evaluate(function() {
      // size: 1 causes generateBracket to return empty rounds, triggering the empty state
      localStorage.setItem('RNR INTAN_tournament', JSON.stringify({ size: 1 }));
      localStorage.removeItem('RNR INTAN_participants');
      localStorage.removeItem('RNR INTAN_bracket');
    });
    await page.reload();
    await page.click('[data-section="bracket"]');
    await expect(page.locator('.bracket-empty')).toBeVisible({ timeout: 8000 });
  });

  test('winner advances to Round 2 slot as static name', async ({ page }) => {
    await setupBracket(page, 16);
    await page.click('[data-section="bracket"]');
    await page.waitForSelector('.score-input', { timeout: 8000 });

    // First match already has Player 1 (p1) and Player 2 (p2) from generateBracket.
    // Enter scores: Player 1 = 7, Player 2 = 3 â†’ Player 1 wins.
    const inputs = page.locator('.score-input');
    await inputs.nth(0).fill('7');
    await inputs.nth(1).fill('3');
    await page.waitForTimeout(400);

    // Round 2 first match p1 slot should show Player 1 as a static label (not a dropdown).
    const round2Column = page.locator('.round-column').nth(1);
    const winnerLabel = round2Column.locator('.participant-name, .participant-label:not(.tbd)').first();
    await expect(winnerLabel).toBeVisible({ timeout: 5000 });
    const text = await winnerLabel.textContent();
    expect(text).toContain('Player 1');
  });
});

