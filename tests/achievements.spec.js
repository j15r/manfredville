// Erfolge (v34.27): schalten sich frei, erscheinen im 🏆-Fenster und
// überstehen Speichern und Laden.
const { test, expect } = require('@playwright/test');
const { openGame, pauseLoop, step, expectNoErrors } = require('./helpers');

test('Erstes Wohnhaus schaltet „Erste Hütte“ frei, mit Protokolleintrag', async ({ page }) => {
  const errors = await openGame(page);
  await pauseLoop(page);
  const vorher = await page.evaluate(() => ({ n: achievementCount(), hut: !!achievements.first_house }));
  expect(vorher.hut).toBe(false);
  await page.evaluate(() => { const w = buildings[0]; createBuilding(w.x + 2, w.y, 'house'); });
  await step(page, 2.5);
  const nachher = await page.evaluate(() => ({
    hut: achievements.first_house,
    log: eventLog.filter(e => e.cat === 'achievement').map(e => e.text),
    knopf: document.getElementById('achToggleCount').textContent
  }));
  expect(nachher.hut).toMatch(/^Tag 1/);
  expect(nachher.log.some(t => t.includes('Erste Hütte'))).toBe(true);
  expect(nachher.knopf).toMatch(/^1\/\d+$/);
  expectNoErrors(errors);
});

test('Ereignis-Erfolge: Pirat versenkt, Alle Klimazonen, Erster Adliger', async ({ page }) => {
  const errors = await openGame(page);
  await pauseLoop(page);
  const r = await page.evaluate(() => {
    // Pirat: ein Pirat wird versenkt
    pirates.push({ x: 10, y: 10, flip: false, bob: 0, hp: 0 });
    sinkPirate(pirates[pirates.length - 1]);
    // Klimazonen: je eine Insel jeder Zone mit einem Gebäude
    for (const klima of ['polar', 'temperate', 'arid']) {
      let gesetzt = false;
      for (let y = 0; y < CFG.mapSize && !gesetzt; y++) for (let x = 0; x < CFG.mapSize && !gesetzt; x++) {
        const id = islandAt(x, y);
        if (id < 0 || id === homeIslandId || islands[id].climate !== klima) continue;
        if (map[y][x].terrain === 'water' || map[y][x].building) continue;
        createBuilding(x, y, 'chapel'); gesetzt = true;
      }
    }
    // Adliger: ein Haus auf Stufe 3
    const w = buildings[0];
    const h = createBuilding(w.x + 2, w.y, 'house'); h.tier = 3; h.population = 5;
    checkAchievements(false);
    return { pirate: !!achievements.pirate, climates: !!achievements.climates, noble: !!achievements.noble, colony: !!achievements.colony };
  });
  expect(r).toEqual({ pirate: true, climates: true, noble: true, colony: true });
  expectNoErrors(errors);
});

test('Erfolgsfenster zeigt freigeschaltete und gesperrte Erfolge mit Symbol', async ({ page }) => {
  const errors = await openGame(page);
  await page.evaluate(() => { const w = buildings[0]; createBuilding(w.x + 2, w.y, 'house'); checkAchievements(false); });
  await page.click('#achToggle');
  const panel = page.locator('#achPanel');
  await expect(panel).toBeVisible();
  const anzahl = await page.evaluate(() => ACHIEVEMENTS.length);
  await expect(panel.locator('.ach-row')).toHaveCount(anzahl);
  await expect(panel.locator('.ach-row.done')).toHaveCount(1);
  await expect(panel.locator('.ach-row.done .ach-icon')).toHaveText('🏠');
  // Filter
  await panel.locator('[data-afilter="danger"]').click();
  const gefahren = await page.evaluate(() => ACHIEVEMENTS.filter(a => a.group === 'danger').length);
  await expect(panel.locator('.ach-row')).toHaveCount(gefahren);
  // jeder Erfolg hat ein Symbol, eine eindeutige ID und eine gültige Gruppe
  const ok = await page.evaluate(() => ACHIEVEMENTS.every(a => a.icon && a.name && a.desc && ACH_GROUPS[a.group])
    && new Set(ACHIEVEMENTS.map(a => a.id)).size === ACHIEVEMENTS.length);
  expect(ok).toBe(true);
  await page.click('#achClose');
  await expect(panel).toBeHidden();
  expectNoErrors(errors);
});

test('Erfolge überstehen Speichern/Laden; alter Stand bekommt Erreichtes still gutgeschrieben', async ({ page }) => {
  const errors = await openGame(page);
  await pauseLoop(page);
  const r = await page.evaluate(() => {
    const w = buildings[0];
    createBuilding(w.x + 2, w.y, 'house');
    achStats.piratesSunk = 3;
    checkAchievements(false);
    const tag = achievements.first_house;
    const stand = JSON.parse(JSON.stringify(serializeGame()));
    applySave(stand);
    const gleich = achievements.first_house === tag && achStats.piratesSunk === 3 && !!achievements.pirate;
    // Alter Stand ohne Erfolgsdaten
    delete stand.achievements; delete stand.achStats; delete stand.research;
    const logVorher = eventLog.length;
    applySave(stand);
    return { gleich, still: achievements.first_house, pirat: !!achievements.pirate, neueLogs: eventLog.length - logVorher };
  });
  expect(r.gleich).toBe(true);
  expect(r.still).toBe('aus früherem Spielstand');
  expect(r.pirat).toBe(false); // Zähler fehlen im alten Stand
  expect(r.neueLogs).toBeLessThanOrEqual(0);
  expectNoErrors(errors);
});
