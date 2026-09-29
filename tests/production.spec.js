// Produktionskette: Holz aus dem Insellager wird von Trägern ins Sägewerk
// gebracht, dort zu Brettern verarbeitet und wieder ins Lager zurückgetragen.
// Geprüft wird bis in den Inselbestand - nicht nur bis in den Puffer des
// Betriebs (siehe docs/architektur.md, Lehre aus v29.2).
const { test, expect } = require('@playwright/test');
const { openGame, pauseLoop, step, expectNoErrors } = require('./helpers');

test('Holz → Sägewerk → Bretter im Insellager', async ({ page }) => {
  const errors = await openGame(page);
  await pauseLoop(page);
  await page.evaluate(() => {
    const w = buildings[0];
    // Straße unter dem Lagerhaus entlang, Sägewerk NEBEN die Straße
    for (let dx = -1; dx <= 3; dx++) {
      const t = map[w.y + 1][w.x + dx];
      t.terrain = 'grass'; t.trees = 0; t.road = true;
    }
    const t = map[w.y][w.x + 3]; t.terrain = 'grass'; t.trees = 0;
    createBuilding(w.x + 3, w.y, 'sawmill');
    const s = storageOfIsland(homeIslandId);
    s.wood = 10; s.plank = 0;
  });
  await step(page, 150);
  const ergebnis = await page.evaluate(() => ({
    wood: stockOf(homeIslandId, 'wood'),
    plank: stockOf(homeIslandId, 'plank')
  }));
  expect(ergebnis.plank).toBeGreaterThanOrEqual(5);
  expect(ergebnis.wood).toBeLessThan(10);
  expectNoErrors(errors);
});
