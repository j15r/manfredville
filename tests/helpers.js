// Gemeinsame Hilfen für alle Testsuiten.
//
// Grundsätze (siehe docs/architektur.md, "Testtechnischer Hinweis"):
// - Jede Suite startet mit leerem Browser-Speicher, sonst stünde die
//   Autosave-Abfrage "Fortsetzen?" über der Karte.
// - Tests, die Spiellogik direkt aufrufen, halten vorher die Spielschleife an
//   (pauseLoop) und treiben die Simulation selbst mit update(dt) (step).
// - Jeder JavaScript-Fehler der Seite lässt den Test fehlschlagen.
const path = require('path');
const { pathToFileURL } = require('url');
const { expect } = require('@playwright/test');

const GAME_URL = pathToFileURL(path.join(__dirname, '..', 'manfredville.html')).href;

async function openGame(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e && e.stack || e)));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto(GAME_URL);
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) { /* egal */ } });
  await page.waitForFunction(() => typeof buildings !== 'undefined' && buildings.length > 0);
  return errors;
}

// Hält die Spielschleife an. Der bereits eingeplante letzte Frame läuft noch -
// danach kurz warten, erst dann Zustände setzen.
async function pauseLoop(page) {
  await page.evaluate(() => {
    window.__origRAF = window.__origRAF || window.requestAnimationFrame;
    window.requestAnimationFrame = () => 0;
  });
  await page.waitForTimeout(200);
}

// Simuliert `seconds` Spielsekunden in Schritten zu `dtMs` (Spielschleife muss
// angehalten sein).
async function step(page, seconds, dtMs = 100) {
  await page.evaluate(({ seconds, dtMs }) => {
    const n = Math.round(seconds * 1000 / dtMs);
    for (let i = 0; i < n; i++) update(dtMs);
  }, { seconds, dtMs });
}

function expectNoErrors(errors) {
  expect(errors, 'JavaScript-Fehler auf der Seite:\n' + errors.join('\n')).toEqual([]);
}

module.exports = { GAME_URL, openGame, pauseLoop, step, expectNoErrors };
