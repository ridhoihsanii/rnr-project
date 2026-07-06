const { test, expect } = require('@playwright/test');
const path = require('path');

test('E2E direct: prefill Budi then generate bracket', async ({ page }) => {
  // prepare localStorage before loading app
  // open app first to ensure same-origin localStorage access
  await page.goto('/index.html');
  // set localStorage within the app origin, then reload to ensure app picks up values
  await page.evaluate(() => {
    localStorage.setItem('RNR INTAN_tournament', JSON.stringify({ size: 32, status: 'setup', currentRound: 0 }));
    const participants = [{ id: 'row-5', slot: 5, phone: '', name: 'Budi', hc: 'HC 3B', hcCustom: '', status: '', drawingNumber: null, createdAt: Date.now(), updatedAt: Date.now() }];
    localStorage.setItem('RNR INTAN_participants', JSON.stringify(participants));
    localStorage.removeItem('RNR INTAN_bracket');
  });
  await page.reload();
  // ensure size is selected
  await page.selectOption('#input-size', '32');
  // generate bracket
  await page.click('#btn-generate-bracket');
  await page.waitForSelector('#bracket-render-area .bracket-wrapper', { timeout: 5000 });

  // wait a bit and screenshot
  await page.waitForTimeout(500);
  const bracket = await page.$('#bracket-render-area');
  const out = path.join('tests', 'artifacts', 'budi-direct-bracket.png');
  if (bracket) await bracket.screenshot({ path: out });
  console.log('Saved bracket screenshot to', out);
});
