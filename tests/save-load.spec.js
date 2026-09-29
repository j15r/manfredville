// Speichern und Laden: ein Spielstand übersteht den Weg über JSON und ein
// Neuladen der Seite vollständig.
const { test, expect } = require('@playwright/test');
const { openGame, pauseLoop, expectNoErrors } = require('./helpers');

async function snapshot(page) {
  return page.evaluate(() => ({
    buildings: buildings.map(b => `${b.type}@${b.x},${b.y}`).sort(),
    planks: stockOf(homeIslandId, 'plank'),
    tools: stockOf(homeIslandId, 'tools'),
    name: islandLabel(homeIslandId),
    treasury: Math.floor(treasury),
    house: (() => { const h = buildings.find(b => b.type === 'house'); return h && { pop: h.population, tier: h.tier }; })()
  }));
}

test('Spielstand übersteht Speichern, Neuladen und Laden', async ({ page }) => {
  let errors = await openGame(page);
  await pauseLoop(page);
  await page.evaluate(() => {
    const w = buildings[0];
    const h = createBuilding(w.x + 2, w.y, 'house');
    h.population = 5; h.tier = 1;
    createBuilding(w.x, w.y + 2, 'chapel');
    addTo(homeIslandId, 'tools', 7);
    treasury = 123;
    renameIsland(homeIslandId, 'Testheim');
  });
  const vorher = await snapshot(page);
  const json = await page.evaluate(() => JSON.stringify(serializeGame()));
  expectNoErrors(errors);

  errors = await openGame(page);
  // Gegenprobe: die frische Karte ist eine andere
  expect((await snapshot(page)).name).not.toBe('Testheim');
  await pauseLoop(page);
  await page.evaluate((j) => applySave(JSON.parse(j)), json);
  const nachher = await snapshot(page);
  expect(nachher).toEqual(vorher);
  expectNoErrors(errors);
});

test('Autosave bietet beim Neuladen das Fortsetzen an', async ({ page }) => {
  const errors = await openGame(page);
  await page.evaluate(() => { renameIsland(homeIslandId, 'Autosaveheim'); autosaveNow(); });
  await page.reload();
  await expect(page.locator('#resumeYes')).toBeVisible();
  await page.click('#resumeYes');
  await expect.poll(() => page.evaluate(() => islandLabel(homeIslandId))).toBe('Autosaveheim');
  expectNoErrors(errors);
});
