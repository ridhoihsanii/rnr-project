const { test, expect } = require('@playwright/test');
const path = require('path');

test('E2E: add Budi and verify bracket updates realtime', async ({ page }) => {
  await page.goto('/index.html');
  // ensure size is 32 (default) and generate bracket so slots exist
  await page.selectOption('#input-size', '32');
  await page.click('#btn-generate-bracket');
  await page.waitForSelector('#bracket-render-area .bracket-wrapper');

  // Fill participant row 5
  const nameSel = '.name-input[data-row="5"]';
  await page.waitForSelector(nameSel);
  await page.fill(nameSel, 'Budi');
  // select HC 3B
  const hcSel = '.hc-select[data-row="5"]';
  await page.selectOption(hcSel, 'HC 3B');
  // blur to trigger save
  await page.locator(nameSel).press('Tab');
  // give autosave debounce time
  await page.waitForTimeout(800);

  // debug: log storage contents to help diagnose
  const partsRaw = await page.evaluate(() => localStorage.getItem('RNR INTAN_participants'));
  const bracketRaw = await page.evaluate(() => localStorage.getItem('RNR INTAN_bracket'));
  console.log('PARTICIPANTS:', partsRaw);
  console.log('BRACKET:', bracketRaw ? bracketRaw.slice(0, 200) + '...' : null);

  // wait until bracket contains Budi in any player-name
  await page.waitForFunction(() => {
    const els = Array.from(document.querySelectorAll('.player-name'));
    return els.some(e => e && e.textContent && e.textContent.trim().indexOf('Budi') !== -1);
  }, null, { timeout: 8000 });

  // take screenshot of participant table and bracket area for diagnosis
  const table = await page.$('#participant-table');
  const bracket = await page.$('#bracket-render-area');
  const out1 = path.join('tests', 'artifacts', 'budi-participant.png');
  const out2 = path.join('tests', 'artifacts', 'budi-bracket.png');
  if (table) await table.screenshot({ path: out1 });
  if (bracket) await bracket.screenshot({ path: out2 });
  console.log('Screenshots saved to', out1, out2);
});
