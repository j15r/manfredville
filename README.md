# Manfredville

Aufbau-Strategiespiel im Browser – ein Mix aus Anno (Produktionsketten), Die Siedler (Trägerlogistik über ein Straßennetz) und Age of Empires.

- **Online spielen:** https://j15r.github.io/manfredville/ (wird bei jedem Push auf `main` nach erfolgreichen Tests automatisch aktualisiert, siehe `.github/workflows/pages.yml`).
- **Offline spielen:** `manfredville.html` im Browser öffnen (Doppelklick genügt). Kein Build-Prozess, kein Server, keine externen Assets – Grafik (Canvas 2D) und Audio (Web Audio API) werden vollständig per Code erzeugt.
- **Entwicklungsstand:** [`status.md`](status.md) – Konzept, Technik und aktueller Funktionsumfang. Architektur, Historie und offene Fragen liegen unter [`docs/`](docs/).
- **Mitentwickeln mit Claude:** [`CLAUDE.md`](CLAUDE.md) enthält die Arbeitsregeln.
- **Tests:** `npm install`, einmalig `npx playwright install chromium`, danach `npm test`.
