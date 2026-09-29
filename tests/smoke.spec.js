// Rauchtest: das Spiel startet, läuft und die Fenster der Titelzeile öffnen
// sich, ohne dass ein JavaScript-Fehler auftritt.
const { test, expect } = require('@playwright/test');
const { openGame, expectNoErrors } = require('./helpers');

test('Spiel startet ohne Fehler mit Lagerhaus auf der Heimatinsel', async ({ page }) => {
  const errors = await openGame(page);
  await expect(page).toHaveTitle(/Manfredville/);
  const start = await page.evaluate(() => ({
    buildings: buildings.map(b => b.type),
    home: homeIslandId,
    planks: stockOf(homeIslandId, 'plank'),
    islands: islands.length
  }));
  expect(start.buildings).toEqual(['warehouse']);
  expect(start.home).toBeGreaterThanOrEqual(0);
  expect(start.planks).toBe(20);
  expect(start.islands).toBeGreaterThan(10);
  // Ein paar Sekunden echte Spielschleife
  await page.waitForTimeout(2500);
  expectNoErrors(errors);
});

test('Fenster der Titelzeile öffnen und schließen sich', async ({ page }) => {
  const errors = await openGame(page);
  for (const [knopf, fenster] of [['#overviewToggle', '#overview'], ['#statsToggle', '#statsPanel'], ['#logToggle', '#logPanel']]) {
    await page.click(knopf);
    await expect(page.locator(fenster)).toBeVisible();
    await page.click(knopf);
    await expect(page.locator(fenster)).toBeHidden();
  }
  await page.click('#settingsToggle');
  await expect(page.locator('#saveBtn')).toBeVisible();
  expectNoErrors(errors);
});

test('Baumenü: ein Wohnhaus lässt sich per Klick auf die Karte setzen', async ({ page }) => {
  const errors = await openGame(page);
  await page.click('.build-group:has([data-tool="house"]) summary');
  await page.click('[data-tool="house"]');
  // Eine freie Kachel neben dem Lagerhaus suchen und ihre Bildschirmposition berechnen
  const ziel = await page.evaluate(() => {
    const w = buildings[0];
    for (const [dx, dy] of [[2, 0], [0, 2], [-2, 0], [0, -2], [2, 2]]) {
      const x = w.x + dx, y = w.y + dy;
      if (canBuildHere(x, y, 'house').ok) {
        const p = gridToScreen(x, y);
        const r = canvas.getBoundingClientRect();
        return { x, y, sx: r.left + p.x, sy: r.top + p.y };
      }
    }
    return null;
  });
  expect(ziel).not.toBeNull();
  await page.mouse.click(ziel.sx, ziel.sy);
  const gebaut = await page.evaluate(() => buildings.filter(b => b.type === 'house').map(b => [b.x, b.y]));
  expect(gebaut.length).toBe(1);
  expectNoErrors(errors);
});
