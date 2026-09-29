# Manfredville – Arbeitsanleitung für Claude

Aufbau-Strategiespiel im Browser (Anno-Produktionsketten + Siedler-Trägerlogistik + später Age-of-Empires-Elemente).
Sprache des Projekts ist **Deutsch**: Oberfläche, Code-Kommentare, Commit-Nachrichten und Dokumentation.

## Dateien

| Datei | Inhalt |
|---|---|
| `manfredville.html` | Das komplette Spiel: HTML, CSS (`<style>`) und ein einziger `<script>`-Block (~17 000 Zeilen). Kein Build, kein Server, keine Assets. Ältere Texte nennen sie `index.html`. |
| `status.md` | Aktueller Stand: Konzept, technische Entscheidungen, **Funktionsumfang**, Ideen. Zuerst lesen. |
| `docs/architektur.md` | Architektur-Gesamtbild, alle „Technischen Hinweise“, Speicherformat, Testlehren. Nachschlagen, bevor ein Bereich geändert wird. |
| `docs/runden-archiv.md` | Historie aller Entwicklungsrunden (neueste oben) und die Liste „Ausgeliefert“. |
| `docs/offene-fragen.md` | Bewusste Setzungen je Runde, zu denen noch Rückmeldung fehlt. |
| `tests/` | Playwright-Tests (`npm test`). |

## Grundregeln

- **Eine Datei bleibt eine Datei.** Alles (Grafik als Canvas-Vektorzeichnung, Musik/Sound über Web Audio) entsteht im Code. Keine externen Bibliotheken, keine Bilder, keine Audiodateien.
- **Stil des bestehenden Codes übernehmen:** Vanilla JS, globale Funktionen und Tabellen, ausführliche deutsche Kommentare, die das WARUM erklären. Neue Stellen mit Versionsmarke kommentieren (`// Universität (NEU, v34.27)`).
- **Datengetrieben erweitern:** neue Gebäude, Waren, Stufen und Schiffe sind in erster Linie Tabelleneinträge (`buildingTypes`, `HOUSE_TIERS`, `PRODUCERS`/`PROCESSORS`/`FIELD_FARMS`, `SHIP_TYPES`, `GOOD_LABELS`, `BUILD_UNLOCKS`). Erst prüfen, ob eine bestehende ODER-Liste oder Tabelle passt, bevor eine neue Mechanik entsteht.
- **Nichts bestraft rückwirkend:** neue Regeln dürfen bestehende Dörfer nicht plötzlich schrumpfen lassen; neue Bedürfnisse sind im Zweifel Wachstumsschranken.
- **Alte Spielstände müssen laden.** `SAVE_VERSION` bleibt 2; neue Felder sind additiv und bekommen beim Laden ausdrückliche Standardwerte (sonst `undefined` → `NaN`).
- **Nie über alle Kacheln je Frame rechnen** (140×140 = 19 600 Kacheln). Teures nur bei Ereignissen oder mit Timer.
- Meldungen mit Spielbedeutung über `logEvent(text, kategorie, pos)` statt `setStatus` ausgeben.
- Forschungswirkungen immer über `researchLevel(key)` abfragen. Neue Erfolge sind ein Eintrag in `ACHIEVEMENTS`; Ereignisse, die sich nicht aus dem Zustand ablesen lassen, zählt `achStats`.

## Zentrale Zugriffswege (nie umgehen)

- Warenbestand: `stockOf` / `spendFrom` / `addTo` je Insel (`islandAt`, `islandOfBuilding`). Münzen (`treasury`) sind kartenweit; `storage.coin` ist ein Getter darauf.
- Bauen: `canBuildHere(gx, gy, tool, opts)` prüft (auch für die Vorschau), `tryPlaceBuilding` bezahlt, `createBuilding` setzt.
- Wohnhäuser: Stufe `b.tier` → `HOUSE_TIERS`; `tierOf`, `houseCapacity`, `tierNeeds`. Freischaltung über den Höchststand `popPeak` (`BUILD_UNLOCKS`, `unlockInfo`).
- Waren wechseln die Insel nur über `shipLoad` / `shipUnload`. Abbau nur über `extractFromTile`.
- Inselnamen nur über `islandLabel(id)`.
- Speichern/Laden: `serializeGame()` / `applySave(data)`; Hausfelder in `HOUSE_FIELDS`. Autosave alle 30 s in `localStorage`.
- Hauptschleife: `update(dt)` ruft alle `update*`-Systeme auf, danach `render()`.

## Checkliste: neues Gebäude

1. `buildingTypes` (Name, `cost`, ggf. `radius`, `climates`, `needsCoast`, `oncePerIsland` …)
2. Knopf im Baumenü (HTML, passende `build-group`) und Eintrag in `PLACEABLE_TOOLS`
3. Erklärtext in `toolHints`
4. Farben in `buildingColors` und Zeichnung als Zweig in `drawBuilding` (Rohbau über `drawBuildingShell`, Requisiten müssen die Silhouette verlassen)
5. Ggf. `BUILD_UNLOCKS`, `FIRE_IMMUNE_TYPES`, Einzugsradius-Anzeige (Liste in `render()`), Zeilen in `renderBuildingInfo`
6. Neue Felder am Gebäude → in `serializeGame`/`applySave` mit Standardwerten

Neue Ware: `GOOD_LABELS`, CSS-Farbvariable + `.swatch`-Regel, `GOOD_COLORS`, `GOOD_BASE_PRICE` (sonst nicht handelbar).

## Tests

```bash
npm install                      # einmalig: installiert @playwright/test
npx playwright install chromium  # nur lokal nötig; in der Claude-Cloud ist Chromium vorinstalliert
npm test                         # alle Tests
npx playwright test tests/smoke.spec.js
```

- Tests öffnen `manfredville.html` direkt über `file://` und rufen Spielfunktionen per `page.evaluate` auf (Top-Level-Funktionen und `let`/`const` sind dort erreichbar).
- Hilfen in `tests/helpers.js`: `openGame` (leert `localStorage`, sammelt JS-Fehler), `pauseLoop` (hält die Spielschleife an), `step(page, sekunden)` (simuliert mit `update(dt)`), `expectNoErrors`.
- Jede neue Mechanik bekommt einen Test. Bis ins Ergebnis prüfen (z. B. Inselbestand statt Betriebspuffer), mit Gegenprobe. Weitere Testlehren: `docs/architektur.md` → „Testtechnischer Hinweis“.
- Vor jedem Push: `npm test` muss grün sein.

## Doku pflegen (jede Runde)

1. Versionsnummer hochzählen (aktuell **v34.27**) – in der Überschrift „Aktueller Funktionsumfang“ in `status.md`.
2. Neue Funktion als **(NEU, vX)**-Eintrag oben in den Funktionsumfang von `status.md`, knapp und mit den Zahlen, die der Spieler wissen muss.
3. Rundenbericht (Wunsch, Entscheidungen, Umsetzung, Verifikation) oben in `docs/runden-archiv.md`; einen Satz in „Ausgeliefert“ ergänzen.
4. Bewusste Setzungen ohne Rückmeldung in `docs/offene-fragen.md`.
5. Neue Architekturregeln bzw. Testlehren in `docs/architektur.md`.
