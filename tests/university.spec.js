// Universität und Forschung (v34.27).
const { test, expect } = require('@playwright/test');
const { openGame, pauseLoop, step, expectNoErrors } = require('./helpers');

// Baut eine Universität und daneben Adelssitze mit `adlige` Bewohnern.
async function aufbau(page, adlige) {
  await page.evaluate((adlige) => {
    const w = buildings[0];
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 5; dx++) {
      const t = map[w.y + dy][w.x + dx]; if (t.terrain !== 'water') { t.terrain = 'grass'; t.trees = 0; }
    }
    createBuilding(w.x + 3, w.y, 'university');
    let rest = adlige, i = 0;
    while (rest > 0) {
      const h = createBuilding(w.x - 2 + i * 2, w.y + 2, 'house');
      h.tier = 3; h.population = Math.min(30, rest); rest -= h.population; i++;
    }
  }, adlige);
}

test('Universität ist erst mit 10 Adligen freigeschaltet', async ({ page }) => {
  const errors = await openGame(page);
  await pauseLoop(page);
  const r = await page.evaluate(() => {
    const vorher = isBuildingUnlocked('university');
    popPeak[3] = 10;
    return { vorher, nachher: isBuildingUnlocked('university') };
  });
  expect(r).toEqual({ vorher: false, nachher: true });
  expectNoErrors(errors);
});

test('Forschung: Gelehrte und Münzen sind Voraussetzung, Stufe wird nach Ablauf gutgeschrieben', async ({ page }) => {
  const errors = await openGame(page);
  await pauseLoop(page);
  await aufbau(page, 5);
  let r = await page.evaluate(() => { treasury = 5000; return { gelehrte: scholarCount(), grund: researchBlocker('navigation') }; });
  expect(r.gelehrte).toBe(5);
  expect(r.grund).toMatch(/10 Gelehrte/);
  // Adliger außerhalb der Reichweite zählt nicht
  await page.evaluate(() => { const h = createBuilding(buildings[0].x - 40 < 0 ? 1 : buildings[0].x, buildings[0].y - 30 < 0 ? 1 : buildings[0].y - 30, 'house'); h.tier = 3; h.population = 30; });
  expect(await page.evaluate(() => scholarCount())).toBe(5);
  await page.evaluate(() => { buildings.filter(b => b.type === 'house')[0].population = 12; });
  r = await page.evaluate(() => ({ gelehrte: scholarCount(), grund: researchBlocker('navigation'), start: startResearch('navigation'), kasse: treasury,
    zweite: researchBlocker('craft') }));
  expect(r.gelehrte).toBe(12);
  expect(r.grund).toBeNull();
  expect(r.start).toBe(true);
  expect(r.kasse).toBe(5000 - 400);
  expect(r.zweite).toMatch(/andere Forschung/);
  await step(page, 30);
  expect(await page.evaluate(() => researchLevel('navigation'))).toBe(0);
  await step(page, 20);
  r = await page.evaluate(() => ({ lvl: researchLevel('navigation'), aktiv: research.active, log: eventLog.some(e => e.text.includes('Navigation Stufe 1')) }));
  expect(r).toEqual({ lvl: 1, aktiv: null, log: true });
  // Stufe 2 braucht 45 Gelehrte
  expect(await page.evaluate(() => researchBlocker('navigation'))).toMatch(/45 Gelehrte/);
  expectNoErrors(errors);
});

test('Ohne Universität ruht die Forschung; Fortschritt übersteht Speichern/Laden', async ({ page }) => {
  const errors = await openGame(page);
  await pauseLoop(page);
  await aufbau(page, 30);
  await page.evaluate(() => { treasury = 1000; startResearch('agriculture'); });
  await step(page, 10);
  const r = await page.evaluate(() => {
    const vorher = research.active.elapsed;
    const stand = JSON.parse(JSON.stringify(serializeGame()));
    applySave(stand);
    const nachLaden = research.active && research.active.key === 'agriculture' && Math.abs(research.active.elapsed - vorher) < 1;
    removeBuilding(buildings.find(b => b.type === 'university'));
    for (let i = 0; i < 100; i++) update(100);
    return { nachLaden, ruht: Math.abs(research.active.elapsed - vorher) < 1 };
  });
  expect(r).toEqual({ nachLaden: true, ruht: true });
  expectNoErrors(errors);
});

test('Verwaltung erhöht die Steuern, Navigation das Schiffstempo', async ({ page }) => {
  const errors = await openGame(page);
  await pauseLoop(page);
  const r = await page.evaluate(() => {
    const w = buildings[0];
    createBuilding(w.x + 2, w.y, 'rathaus');
    const h = createBuilding(w.x - 2, w.y, 'house'); h.population = 10;
    const basis = taxIncomeOf(homeIslandId);
    research.levels.administration = 2;
    const steuer = taxIncomeOf(homeIslandId) / basis;
    // Echte Fahrt über updateShips: dieselbe Strecke, gleiche Stelle (Wetter
    // steht, weil updateWeather nicht läuft), einmal ohne, einmal mit Navigation 3
    const fahrt = (lvl) => {
      research.levels.navigation = lvl;
      const s = { x: 5, y: 5, tx: 5 + 50, ty: 5, waypoints: [], cargo: {}, shipType: 'small', hp: 100, routeId: null };
      ships.push(s);
      updateShips(1000);
      ships.splice(ships.indexOf(s), 1);
      return s.x - 5;
    };
    return { steuer, schiff: fahrt(3) / fahrt(0) };
  });
  expect(r.steuer).toBeCloseTo(1.2, 5);
  expect(r.schiff).toBeCloseTo(1.3, 5);
  expectNoErrors(errors);
});

test('Bergbautechnik schont das Vorkommen', async ({ page }) => {
  const errors = await openGame(page);
  await pauseLoop(page);
  const r = await page.evaluate(() => {
    // Eine Gebirgskachel mit großem Steinvorrat; 400 Steinbruch-Fuhren über
    // finishWork, einmal ohne und einmal mit Stufe 3
    const abbau = (lvl) => {
      research.levels.mining = lvl;
      const t = map[2][2];
      const alt = { terrain: t.terrain, stone: t.stone };
      t.terrain = 'mountain'; t.stone = 1000;
      let fuhren = 0;
      for (let i = 0; i < 400; i++) {
        const c = { action: 'quarry', target: { x: 2, y: 2 }, path: [{ x: 3, y: 2 }, { x: 2, y: 2 }] };
        finishWork(c);
        if (c.carryGood === 'stone') fuhren++;
      }
      const verbraucht = 1000 - t.stone;
      t.terrain = alt.terrain; t.stone = alt.stone;
      return { fuhren, verbraucht };
    };
    return { ohne: abbau(0), mit: abbau(3) };
  });
  expect(r.ohne).toEqual({ fuhren: 400, verbraucht: 400 });
  expect(r.mit.fuhren).toBe(400);
  expect(r.mit.verbraucht).toBeLessThan(260); // erwartet ~200 (50 % geschont)
  expect(r.mit.verbraucht).toBeGreaterThan(140);
  expectNoErrors(errors);
});

test('Handwerkskunst beschleunigt ein Sägewerk messbar', async ({ page }) => {
  const errors = await openGame(page);
  await pauseLoop(page);
  const lauf = async (lvl) => page.evaluate((lvl) => {
    research.levels.craft = lvl;
    const w = buildings[0];
    const t = map[w.y][w.x + 3]; t.terrain = 'grass'; t.trees = 0;
    const b = createBuilding(w.x + 3, w.y, 'sawmill');
    b.storage.wood = 2;
    let ms = 0;
    while ((b.storage.plank || 0) < 1 && ms < 60000) { updateProduction(b, 100); ms += 100; }
    removeBuilding(b);
    return ms;
  }, lvl);
  const ohne = await lauf(0), mit = await lauf(3);
  expect(ohne / mit).toBeGreaterThan(1.35);
  expectNoErrors(errors);
});

test('Fruchtfolge: Ernten bringen im Mittel mehr Einheiten', async ({ page }) => {
  const errors = await openGame(page);
  await pauseLoop(page);
  const r = await page.evaluate(() => {
    const w = buildings[0];
    const tx = w.x + 2, ty = w.y;
    const t = map[ty][tx]; t.terrain = 'grass'; t.trees = 0;
    const farm = createBuilding(w.x + 3, w.y + 3, 'farm');
    farm.storage.grain = 0;
    const ernte = (lvl, n) => {
      research.levels.agriculture = lvl;
      let sum = 0;
      for (let i = 0; i < n; i++) {
        t.terrain = 'field'; t.growthKind = 'crop'; t.growthStage = maxGrowthStage('crop');
        farm.storage.grain = 0;
        const c = { building: farm, action: 'harvest', cropKind: 'crop', phase: 'out', target: { x: tx, y: ty }, path: [{ x: farm.x, y: farm.y }, { x: tx, y: ty }] };
        carriers.push(c);
        handleFieldArrival(c, carriers.length - 1); // am Feld: ernten
        handleFieldArrival(c, carriers.indexOf(c)); // zurück am Hof: einlagern
        sum += farm.storage.grain;
      }
      return sum / n;
    };
    return { ohne: ernte(0, 300), mit: ernte(3, 300) };
  });
  expect(r.ohne).toBe(1);
  expect(r.mit).toBeGreaterThan(1.6);
  expect(r.mit).toBeLessThanOrEqual(2);
  expectNoErrors(errors);
});

test('Universitäts-Panel: Knopf startet Forschung', async ({ page }) => {
  const errors = await openGame(page);
  await pauseLoop(page);
  await aufbau(page, 20);
  await page.evaluate(() => {
    treasury = 800;
    selectedBuilding = buildings.find(b => b.type === 'university');
    renderBuildingInfo();
  });
  const panel = page.locator('#buildingInfo');
  await expect(panel).toContainText('Gelehrte');
  await expect(panel.locator('.uni-row')).toHaveCount(6);
  await panel.locator('[data-research="craft"]').click();
  const r = await page.evaluate(() => ({ aktiv: research.active && research.active.key, kasse: treasury }));
  expect(r).toEqual({ aktiv: 'craft', kasse: 400 });
  await expect(panel).toContainText('Forschung läuft');
  expectNoErrors(errors);
});
