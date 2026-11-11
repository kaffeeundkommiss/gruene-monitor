import { test, expect } from "@playwright/test";

// partei.json ist redaktionell gepflegt und ändert sich selten: die Seite wird mit der
// echten Datei getestet, nicht mit einem Fixture.
test.beforeEach(async ({ page }) => {
  await page.route("**/fonts.googleapis.com/**", (r) => r.abort());
});

test("Parteiseite zeichnet Kennzahlen und alle Diagramme", async ({ page }) => {
  const fehler = [];
  page.on("pageerror", (e) => fehler.push(e.message));
  await page.goto("/partei.html");

  await expect(page.locator("#kennzahlen")).toContainText("14,8 %");
  await expect(page.locator("#kennzahlen")).toContainText("3 von 8");
  await expect(page.locator("#chart-wahlen rect")).toHaveCount(8);
  await expect(page.locator("#chart-zeit rect")).not.toHaveCount(0);
  await expect(page.locator("#chart-vorsitz rect")).toHaveCount(11);
  await expect(page.locator("#tabelle-vorsitz tbody tr")).toHaveCount(11);
  await expect(page.locator("#vorsitz-kennzahlen")).toContainText("Claudia Roth / Cem Özdemir");
  await expect(page.locator("#vorsitz-kennzahlen")).toContainText("amtierend: Franziska Brantner / Felix Banaszak");
  expect(fehler).toEqual([]);
});

test("Reihenfolge: Wahlen, Zeitleiste, Vorsitzende", async ({ page }) => {
  await page.goto("/partei.html");
  const ids = await page.locator("main .chart").evaluateAll((els) => els.map((e) => e.id));
  expect(ids).toEqual(["chart-wahlen", "chart-zeit", "chart-vorsitz"]);
});

test("Parteiseite passt auf Handybreite ohne seitliches Scrollen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  for (const seite of ["/partei.html"]) {
    await page.goto(seite);
    if (seite === "/partei.html") await expect(page.locator("main .chart svg").first()).toBeVisible();
    const breite = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(breite).toBeLessThanOrEqual(390);
  }
});

test("Navigation verbindet beide Seiten", async ({ page }) => {
  await page.route("**/api.dawum.de/**", (r) => r.abort());
  await page.goto("/index.html");
  await expect(page.locator('nav.seiten a[aria-current="page"]')).toHaveText("Umfragen");
  await page.locator("nav.seiten a", { hasText: "Partei" }).click();
  await expect(page).toHaveURL(/partei\.html$/);
  await expect(page.locator('nav.seiten a[aria-current="page"]')).toHaveText("Partei");
  await expect(page.locator("nav.seiten a")).toHaveText(["Umfragen", "Partei"]);
});

test("Zeitleiste am Handy: Farblegende und Namen der unbeschrifteten Balken", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/partei.html");
  await expect(page.locator("#legende-zeit")).toContainText("Opposition");
  // Die Grünen sind seit 1998 durchgehend im Bundestag: keine Legende für eine Rolle ohne Daten.
  await expect(page.locator("#legende-zeit")).not.toContainText("Nicht im Bundestag");
  const schl = page.locator("#schluessel-zeit");
  await expect(schl).toBeVisible();
  await expect(schl).toContainText("Kuhn/Künast");
});

test("Quellen der Parteiseite widersprechen sich nicht", async ({ page }) => {
  // Die angekündigte Neuwahl ist mit tagesschau und Deutschlandfunk belegt; dann müssen beide genannt sein.
  await page.goto("/partei.html");
  await expect(page.locator("main")).toContainText("04.–06.12.2026 angekündigt (tagesschau, Deutschlandfunk)");
  await expect(page.locator("footer")).not.toContainText("partei.json");
});

test("Zeitleiste am Desktop: Schlüssel nur für Spuren, deren Balken zu schmal sind", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/partei.html");
  const schl = page.locator("#schluessel-zeit");
  await expect(schl).not.toContainText("Rolle im Bund");  // deckt die Farblegende ab
});
