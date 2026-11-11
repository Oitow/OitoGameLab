import { Session } from "../src/core/Session.js";
import { FixedStep } from "../src/core/FixedStep.js";
import { Input } from "../src/input/Input.js";
import { Renderer } from "../src/render/Renderer.js";
import { games, getGameDefinition } from "../games/registry.js";
import { SaveStore } from "../src/storage/SaveStore.js";
const $ = (s) => document.querySelector(s),
  definitions = games,
  clock = new FixedStep();
let session,
  renderer,
  input,
  frame,
  last = 0,
  paused = false,
  contextLost = false,
  uiTime = 0,
  frames = 0;
const notify = (message) => {
  $("#message").textContent = message;
};
function save() {
  try {
    new SaveStore(localStorage).save(session);
    notify("Spielstand gespeichert.");
  } catch {
    notify("Speichern ist in diesem Browser nicht verfügbar.");
  }
}
function start(id, seed, data) {
  session = new Session(getGameDefinition(id), seed);
  if (data && !session.restore(data))
    throw new Error("Spielstand ist ungültig.");
  input.onBlur();
  clock.reset();
  renderer.mount(session);
  $("#game").value = session.id;
  $("#seed").value = session.terrain.seed;
  $("#objective").textContent = session.game.status();
  notify("WASD / Joystick · Leertaste / Sprung");
}
function setPaused(value) {
  if (!value && contextLost) return;
  paused = value;
  input.setEnabled(!paused);
  clock.reset();
  last = 0;
  $("#pause").textContent = paused ? "Weiter" : "Pause";
  $("#pause").setAttribute("aria-pressed", String(paused));
  notify(paused ? "Pause" : session.game.status());
}
try {
  renderer = new Renderer($("#scene"));
  input = new Input($("#joystick"), $("#knob"));
  for (const game of games.values()) {
    const option = document.createElement("option");
    option.value = game.id;
    option.textContent = game.name;
    $("#game").append(option);
  }
  const params = new URLSearchParams(location.search),
    seed = Number(params.get("seed") || 12345);
  start(params.get("game") || "explorer", Number.isFinite(seed) ? seed : 12345);
  $("#game").onchange = () => start($("#game").value, session.terrain.seed);
  $("#world").onsubmit = (e) => {
    e.preventDefault();
    start(session.id, Number($("#seed").value));
  };
  $("#random").onclick = () =>
    start(session.id, crypto.getRandomValues(new Uint32Array(1))[0]);
  $("#pause").onclick = () => {
    if (paused) $("#settings").open = false;
    setPaused(!paused);
  };
  $("#save").onclick = save;
  $("#load").onclick = () => {
    try {
      const candidate = new SaveStore(localStorage).load(
        games,
        (definition, seed) => new Session(definition, seed),
      );
      session = candidate;
      input.onBlur();
      clock.reset();
      renderer.mount(session);
      $("#game").value = session.id;
      $("#seed").value = session.terrain.seed;
      notify("Spielstand geladen.");
    } catch {
      notify("Kein gültiger Spielstand gefunden.");
    }
  };
  $("#settings").addEventListener("toggle", () => {
    if ($("#settings").open) setPaused(true);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) setPaused(true);
  });
  $("#scene").addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    contextLost = true;
    $("#pause").disabled = true;
    setPaused(true);
    notify("Grafik unterbrochen. Wiederherstellung läuft …");
  });
  $("#scene").addEventListener("webglcontextrestored", () => {
    contextLost = false;
    $("#pause").disabled = false;
    setPaused(true);
    renderer.mount(session);
    notify("Grafik wiederhergestellt. Mit Weiter fortsetzen.");
  });
  function tick(time) {
    frame = requestAnimationFrame(tick);
    const dt = last ? Math.min((time - last) / 1000, 0.1) : 0;
    last = time;
    if (contextLost) return;
    let alpha = 1;
    if (!paused) {
      input.update();
      alpha = clock.advance(dt, (step) => {
        const feedback = session.step(step, {
          x: input.direction.x,
          z: input.direction.y,
          jump: input.consumeJump(),
          interact: input.consumeInteract(),
        });
        if (feedback) notify(feedback);
      });
    }
    renderer.draw(paused ? 0 : dt, session, alpha);
    const interactive = Boolean(session.game.interact);
    $("#interact").hidden = !interactive;
    $("#interact").disabled =
      paused || !session.game.prompt?.(session.character.state);
    $("#prompt").textContent = paused
      ? ""
      : session.game.prompt?.(session.character.state) || "";
    $("#inventory").hidden = !session.game.inventory;
    $("#inventory").textContent = session.game.inventory
      ? `Holz ${session.game.inventory.count("wood")} · Stein ${session.game.inventory.count("stone")}`
      : "";
    uiTime += dt;
    frames++;
    if (uiTime >= 0.5) {
      $("#objective").textContent = session.game.status();
      $("#stats").textContent =
        `${Math.round(frames / uiTime)} FPS · ${renderer.renderer.info.render.calls} Draw Calls · Seed ${session.terrain.seed}`;
      uiTime = 0;
      frames = 0;
    }
  }
  frame = requestAnimationFrame(tick);
  window.addEventListener(
    "pagehide",
    () => {
      cancelAnimationFrame(frame);
      input.dispose();
      renderer.dispose();
    },
    { once: true },
  );
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) location.reload();
  });
} catch (error) {
  console.error(error);
  $("#error").hidden = false;
  $("#error").textContent =
    `Start fehlgeschlagen: ${error.message}. Bitte Seite neu laden und WebGL/Internetverbindung prüfen.`;
}
