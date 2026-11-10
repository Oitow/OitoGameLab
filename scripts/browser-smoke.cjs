// Optional browser suite. CI supplies Playwright through OITO_PLAYWRIGHT_MODULE.
const { chromium } = require(
  process.env.OITO_PLAYWRIGHT_MODULE || "playwright",
);
const { spawn } = require("node:child_process");
const { mkdir } = require("node:fs/promises");
const assert = require("node:assert/strict");
(async () => {
  const server = spawn(process.execPath, ["scripts/serve.mjs"], {
    stdio: "pipe",
  });
  let browser;
  try {
    await new Promise((resolve, reject) => {
      server.stdout.once("data", resolve);
      server.once("error", reject);
      server.once("exit", (code) =>
        reject(new Error(`Server exited: ${code}`)),
      );
    });
    await mkdir("test-results", { recursive: true });
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error" && !m.text().includes("favicon"))
        errors.push(m.text());
    });
    await page.goto("http://localhost:4173/play/");
    await page.waitForFunction(
      () =>
        document.querySelector("#objective").textContent ===
        "Erkunde deine Insel",
    );
    assert.equal(await page.locator("#error").isVisible(), false);
    await page.screenshot({ path: "test-results/portrait.png" });
    const snapshot = async () => {
      await page.locator("summary").click();
      await page.locator("#save").click();
      const result = await page.evaluate(() =>
        JSON.parse(localStorage.getItem("oito.save.v1")),
      );
      await page.locator("#pause").click();
      return result;
    };
    const before = await snapshot();
    await page.locator("#scene").click({ position: { x: 200, y: 350 } });
    await page.keyboard.down("w");
    await page.waitForTimeout(700);
    await page.keyboard.press("Space");
    await page.keyboard.up("w");
    const after = await snapshot();
    assert.ok(
      Math.hypot(
        after.player.x - before.player.x,
        after.player.z - before.player.z,
      ) > 0.1,
      "keyboard moves the character",
    );
    // Pointer control uses the same handlers as touch, including pointer capture.
    await page.mouse.move(88, 756);
    await page.mouse.down();
    await page.mouse.move(120, 730);
    await page.waitForTimeout(400);
    await page.mouse.up();
    const afterPointer = await snapshot();
    assert.ok(
      Math.hypot(
        afterPointer.player.x - after.player.x,
        afterPointer.player.z - after.player.z,
      ) > 0.1,
      "joystick moves the character",
    );
    await page.locator("summary").click();
    await page.selectOption("#game", "scavenger");
    await page.locator("#save").click();
    const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("oito.save.v1")),
    );
    await page.locator("#random").click();
    await page.locator("#load").click();
    assert.equal(
      await page.locator("#message").textContent(),
      "Spielstand geladen.",
    );
    assert.equal(Number(await page.locator("#seed").inputValue()), saved.seed);
    assert.equal(await page.locator("#game").inputValue(), "scavenger");
    await page.evaluate(() => localStorage.setItem("oito.save.v1", "{broken"));
    await page.locator("#load").click();
    assert.equal(
      await page.locator("#message").textContent(),
      "Kein gültiger Spielstand gefunden.",
    );
    await page.locator("#pause").click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: "test-results/scavenger.png" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(200);
    await page.screenshot({ path: "test-results/desktop.png" });
    await page.locator("summary").click();
    for (let i = 0; i < 5; i++) await page.locator("#random").click();
    await page.locator("#pause").click();
    assert.deepEqual(errors, [], "no browser runtime errors");
    console.log(
      "Browser smoke passed: boot, keyboard, pointer, game switch, regeneration, save/load, invalid save, portrait and desktop captures.",
    );
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
