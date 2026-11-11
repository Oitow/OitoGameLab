// Optional browser suite. CI supplies Playwright through OITO_PLAYWRIGHT_MODULE.
const { chromium } = require(
  process.env.OITO_PLAYWRIGHT_MODULE || "playwright",
);
const { spawn } = require("node:child_process");
const { mkdir, writeFile } = require("node:fs/promises");
const assert = require("node:assert/strict");
const SAVE_KEY = "oito.save.v2";
(async () => {
  const server = spawn(process.execPath, ["scripts/serve.mjs"], {
    stdio: "pipe",
  });
  let browser, page;
  const errors = [];
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Dev server did not start within 10 seconds")),
        10000,
      );
      server.stdout.once("data", () => {
        clearTimeout(timer);
        resolve();
      });
      server.once("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
      server.once("exit", (code) => {
        clearTimeout(timer);
        reject(new Error(`Server exited: ${code}`));
      });
    });
    await mkdir("test-results", { recursive: true });
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error" && !m.text().includes("favicon"))
        errors.push(m.text());
    });
    // Object-prototype names must be treated as unknown game ids, not definitions.
    await page.goto("http://localhost:4173/play/?game=constructor");
    await page.waitForFunction(
      () =>
        document.querySelector("#objective").textContent ===
        "Erkunde deine Insel",
    );
    assert.equal(await page.locator("#error").isVisible(), false);
    await page.screenshot({ path: "test-results/portrait.png" });
    const openSettings = async () => {
      if (
        !(await page.locator("#settings").evaluate((element) => element.open))
      )
        await page.locator("summary").click();
      await page.waitForFunction(
        () =>
          document.querySelector("#pause").getAttribute("aria-pressed") ===
          "true",
      );
    };
    const readSaved = () =>
      page.evaluate((key) => JSON.parse(localStorage.getItem(key)), SAVE_KEY);
    const snapshot = async (resume = true) => {
      await openSettings();
      await page.locator("#save").click();
      const result = await readSaved();
      assert.equal(result.version, 2);
      if (resume) await page.locator("#pause").click();
      return result;
    };
    const distance = (a, b) =>
      Math.hypot(a.player.x - b.player.x, a.player.z - b.player.z);
    const beforePause = await snapshot(false);
    await page.locator("#scene").click({ position: { x: 340, y: 500 } });
    await page.keyboard.down("w");
    await page.keyboard.press("Space");
    await page.waitForTimeout(350);
    const duringPause = await snapshot(false);
    assert.equal(
      distance(beforePause, duringPause),
      0,
      "pause freezes simulation",
    );
    await page.locator("#pause").click();
    await page.keyboard.up("w");
    await page.waitForTimeout(250);
    const afterPause = await snapshot();
    assert.equal(
      distance(beforePause, afterPause),
      0,
      "resume clears input queued during pause",
    );

    await page.locator("#scene").click({ position: { x: 200, y: 350 } });
    await page.keyboard.down("w");
    await page.waitForTimeout(700);
    await page.keyboard.press("Space");
    await page.keyboard.up("w");
    const afterKeyboard = await snapshot();
    assert.ok(
      distance(afterKeyboard, afterPause) > 0.1,
      "keyboard moves the character",
    );

    // Pointer control uses the same ownership/capture handlers as touch.
    const joystick = await page.locator("#joystick").boundingBox();
    const cx = joystick.x + joystick.width / 2,
      cy = joystick.y + joystick.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 32, cy - 26);
    await page.waitForTimeout(400);
    await page.mouse.up();
    const afterPointer = await snapshot();
    assert.ok(
      distance(afterPointer, afterKeyboard) > 0.1,
      "joystick moves the character",
    );

    // Explicit blur exercises the listener without relying on CI window focus behavior.
    await page.locator("#scene").click({ position: { x: 200, y: 350 } });
    await page.keyboard.down("d");
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 30, cy);
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await page.mouse.up();
    assert.equal(
      await page
        .locator("#knob")
        .evaluate((element) => element.style.transform),
      "translate(0px, 0px)",
    );
    await page.waitForTimeout(1000); // controller braking settles; no held input remains
    const afterBlur = await snapshot();
    await page.waitForTimeout(400);
    const afterSettling = await snapshot();
    assert.ok(
      distance(afterBlur, afterSettling) < 0.02,
      "blur releases held movement",
    );
    await page.keyboard.up("d");

    await openSettings();
    await page.selectOption("#game", "scavenger");
    await page.locator("#save").click();
    const saved = await readSaved();
    await page.locator("#random").click();
    await page.locator("#load").click();
    assert.equal(
      await page.locator("#message").textContent(),
      "Spielstand geladen.",
    );
    assert.equal(Number(await page.locator("#seed").inputValue()), saved.seed);
    assert.equal(await page.locator("#game").inputValue(), "scavenger");
    await page.evaluate(
      (key) => localStorage.setItem(key, "{broken"),
      SAVE_KEY,
    );
    await page.locator("#load").click();
    assert.equal(
      await page.locator("#message").textContent(),
      "Kein gültiger Spielstand gefunden.",
    );
    assert.equal(
      await page.locator("#game").inputValue(),
      "scavenger",
      "bad save preserves current game",
    );
    await page.locator("#pause").click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: "test-results/scavenger.png" });

    await openSettings();
    await page.selectOption("#game", "camp");
    await page.locator("#pause").click();
    await page.waitForTimeout(300);
    assert.equal(
      await page.locator("#interact").isVisible(),
      true,
      "camp exposes touch interaction",
    );
    assert.equal(
      await page.locator("#inventory").isVisible(),
      true,
      "camp exposes inventory feedback",
    );
    await page.screenshot({ path: "test-results/camp.png" });
    await openSettings();
    const bounds = await page.locator("#settings section").boundingBox();
    assert.ok(
      bounds.x >= 0 &&
        bounds.x + bounds.width <= 390 &&
        bounds.y + bounds.height <= 844,
      "portrait settings stay within viewport",
    );
    await page.screenshot({ path: "test-results/settings-portrait.png" });
    await page.locator("#pause").click();

    // Exercise actual WebGL loss/recovery rather than dispatching fake canvas events.
    const canLoseContext = await page.evaluate(() => {
      const canvas = document.querySelector("#scene");
      const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
      const extension = gl?.getExtension("WEBGL_lose_context");
      if (!extension) return false;
      window.__oitoTestContext = extension;
      extension.loseContext();
      return true;
    });
    assert.equal(
      canLoseContext,
      true,
      "CI browser exposes WebGL context-loss extension",
    );
    await page.waitForFunction(
      () =>
        document.querySelector("#pause").getAttribute("aria-pressed") ===
        "true",
    );
    if (await page.locator("#pause").isEnabled())
      await page.locator("#pause").click();
    assert.equal(
      await page.locator("#pause").getAttribute("aria-pressed"),
      "true",
      "cannot resume while context is lost",
    );
    await page.evaluate(() => {
      window.__oitoTestContext.restoreContext();
      delete window.__oitoTestContext;
    });
    await page.waitForFunction(() =>
      document
        .querySelector("#message")
        .textContent.includes("wiederhergestellt"),
    );
    assert.equal(
      await page.locator("#pause").getAttribute("aria-pressed"),
      "true",
      "restored context waits for explicit resume",
    );
    await page.locator("#pause").click();
    await page.waitForTimeout(250);
    await page.screenshot({ path: "test-results/context-restored.png" });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(200);
    await page.screenshot({ path: "test-results/desktop.png" });
    await openSettings();
    for (let i = 0; i < 5; i++) await page.locator("#random").click();
    await page.locator("#pause").click();
    assert.deepEqual(errors, [], "no browser runtime errors");
    console.log(
      "Browser smoke passed: unknown-game fallback, keyboard/pointer, pause/blur release, game switch, regeneration, v2 save/load, invalid save, camp UI, responsive settings and actual WebGL loss/recovery.",
    );
  } catch (error) {
    if (page) {
      await page
        .screenshot({ path: "test-results/failure.png" })
        .catch(() => {});
      await writeFile(
        "test-results/browser-errors.json",
        JSON.stringify({ message: error.message, errors }, null, 2),
      );
    }
    throw error;
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
