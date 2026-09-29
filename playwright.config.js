// Playwright-Konfiguration für die automatischen Tests von Manfredville.
// Das Spiel ist eine einzelne HTML-Datei ohne Server - die Tests öffnen sie
// direkt über file:// (siehe tests/helpers.js).
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 1280, height: 800 }
  }
});
